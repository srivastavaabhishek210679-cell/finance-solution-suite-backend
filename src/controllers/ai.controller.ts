import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import pool from '../config/database';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ?? Fetch business context from DB ?????????????????????????????????????????
async function getBusinessContext(tenantId: number): Promise<string> {
  try {
    const [emps, orders, expenses, budgets, leaves, tickets, inventory, deals, risks, payroll] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as active FROM employees WHERE tenant_id=$2', ['Active', tenantId]),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as revenue, COUNT(CASE WHEN status=$1 THEN 1 END) as pending, COUNT(CASE WHEN payment_status=$2 THEN 1 END) as unpaid FROM orders WHERE tenant_id=$3', ['Pending', 'Pending', tenantId]),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as total_amount, COUNT(CASE WHEN status=$1 THEN 1 END) as pending FROM expenses WHERE tenant_id=$2', ['Pending', tenantId]),
      pool.query('SELECT department, allocated_amount, spent_amount, ROUND((spent_amount/NULLIF(allocated_amount,0)*100)::numeric,1) as pct FROM budgets WHERE tenant_id=$1 AND status=$2 ORDER BY pct DESC LIMIT 5', [tenantId, 'Active']),
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as pending FROM leave_requests WHERE tenant_id=$2', ['Pending', tenantId]),
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as open, COUNT(CASE WHEN priority=$2 THEN 1 END) as critical FROM helpdesk_tickets WHERE tenant_id=$3', ['Open', 'Critical', tenantId]),
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN current_stock <= minimum_stock THEN 1 END) as low_stock FROM inventory_items WHERE tenant_id=$1', [tenantId]),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(deal_value),0) as pipeline_value, COUNT(CASE WHEN stage=$1 THEN 1 END) as closed_won FROM deals WHERE tenant_id=$2', ['Closed Won', tenantId]),
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as open_risks, COUNT(CASE WHEN impact=$2 THEN 1 END) as critical FROM risks WHERE tenant_id=$3', ['Open', 'Critical', tenantId]),
      pool.query('SELECT month, year, total_gross, total_net, employee_count FROM payroll_runs WHERE tenant_id=$1 ORDER BY year DESC, month DESC LIMIT 3', [tenantId]),
    ]);

    const budgetList = budgets.rows.map((b: any) =>
      `${b.department}: Rs.${parseFloat(b.spent_amount).toLocaleString('en-IN')} / Rs.${parseFloat(b.allocated_amount).toLocaleString('en-IN')} (${b.pct}%)`
    ).join(', ');

    const payrollList = payroll.rows.map((p: any) =>
      `${p.month}/${p.year}: Gross Rs.${parseFloat(p.total_gross).toLocaleString('en-IN')}, Net Rs.${parseFloat(p.total_net).toLocaleString('en-IN')} (${p.employee_count} employees)`
    ).join(' | ');

    return `
CURRENT BUSINESS DATA (Deemona Enterprise ERP):
================================================
EMPLOYEES: ${emps.rows[0].active} active out of ${emps.rows[0].total} total

ORDERS & REVENUE:
- Total orders: ${orders.rows[0].total}
- Total revenue: Rs.${parseFloat(orders.rows[0].revenue).toLocaleString('en-IN')}
- Pending orders: ${orders.rows[0].pending}
- Unpaid orders: ${orders.rows[0].unpaid}

EXPENSES:
- Total claims: ${expenses.rows[0].total}
- Total amount: Rs.${parseFloat(expenses.rows[0].total_amount).toLocaleString('en-IN')}
- Pending approval: ${expenses.rows[0].pending}

BUDGET UTILISATION (Top 5):
${budgetList}

LEAVE MANAGEMENT:
- Total requests: ${leaves.rows[0].total}
- Pending approval: ${leaves.rows[0].pending}

HELPDESK:
- Total tickets: ${tickets.rows[0].total}
- Open tickets: ${tickets.rows[0].open}
- Critical tickets: ${tickets.rows[0].critical}

INVENTORY:
- Total items: ${inventory.rows[0].total}
- Low/out of stock: ${inventory.rows[0].low_stock}

SALES PIPELINE:
- Total deals: ${deals.rows[0].total}
- Pipeline value: Rs.${parseFloat(deals.rows[0].pipeline_value).toLocaleString('en-IN')}
- Closed won: ${deals.rows[0].closed_won}

RISKS:
- Total risks: ${risks.rows[0].total}
- Open risks: ${risks.rows[0].open_risks}
- Critical risks: ${risks.rows[0].critical}

RECENT PAYROLL:
${payrollList}
================================================`;
  } catch (e: any) {
    console.error('[AI] Context error:', e.message);
    return 'Business data temporarily unavailable.';
  }
}

// ?? Execute natural language DB query ?????????????????????????????????????
async function executeNLQuery(question: string, tenantId: number): Promise<any> {
  const q = question.toLowerCase();

  // Leave queries
  if (q.includes('leave') && (q.includes('tomorrow') || q.includes('today') || q.includes('pending'))) {
    const result = await pool.query(
      `SELECT employee_name, leave_type, start_date, end_date, total_days, status
       FROM leave_requests WHERE tenant_id=$1
       AND (status='Pending' OR start_date >= CURRENT_DATE)
       ORDER BY start_date ASC LIMIT 10`,
      [tenantId]
    );
    return { type: 'leave_requests', data: result.rows };
  }

  // Unpaid invoice queries
  if ((q.includes('unpaid') || q.includes('overdue')) && (q.includes('invoice') || q.includes('payment'))) {
    const amount = q.match(/(?:rs\.?|inr|rupees?)\s*(\d+[\d,]*)/i);
    const minAmount = amount ? parseFloat(amount[1].replace(/,/g, '')) : 0;
    const result = await pool.query(
      `SELECT invoice_number, customer_name, total_amount, due_date, status
       FROM generated_invoices WHERE tenant_id=$1
       AND status IN ('Sent','Overdue') AND total_amount >= $2
       ORDER BY total_amount DESC LIMIT 10`,
      [tenantId, minAmount]
    );
    return { type: 'invoices', data: result.rows };
  }

  // Employee queries
  if (q.includes('employee') && (q.includes('department') || q.includes('list') || q.includes('who'))) {
    const deptMatch = q.match(/(?:in|from|of)\s+([a-zA-Z]+)\s+(?:department|dept|team)?/);
    const dept = deptMatch ? deptMatch[1] : null;
    const result = await pool.query(
      `SELECT name, department, designation, status, salary FROM employees
       WHERE tenant_id=$1 ${dept ? 'AND department ILIKE $2' : ''}
       ORDER BY department, name LIMIT 20`,
      dept ? [tenantId, `%${dept}%`] : [tenantId]
    );
    return { type: 'employees', data: result.rows };
  }

  // Budget queries
  if (q.includes('budget') && (q.includes('remaining') || q.includes('left') || q.includes('utilisation') || q.includes('overspent'))) {
    const result = await pool.query(
      `SELECT department, allocated_amount, spent_amount,
       allocated_amount - spent_amount as remaining,
       ROUND((spent_amount/NULLIF(allocated_amount,0)*100)::numeric,1) as utilisation_pct
       FROM budgets WHERE tenant_id=$1 AND status='Active'
       ORDER BY utilisation_pct DESC`,
      [tenantId]
    );
    return { type: 'budgets', data: result.rows };
  }

  // Order/revenue queries
  if (q.includes('order') || q.includes('revenue') || q.includes('sales')) {
    const result = await pool.query(
      `SELECT order_number, customer_name, total_amount, status, payment_status, order_date
       FROM orders WHERE tenant_id=$1
       ORDER BY created_at DESC LIMIT 15`,
      [tenantId]
    );
    return { type: 'orders', data: result.rows };
  }

  // Inventory queries
  if (q.includes('stock') || q.includes('inventory') || q.includes('item')) {
    const result = await pool.query(
      `SELECT item_name, category, current_stock, minimum_stock, unit_price,
       CASE WHEN current_stock = 0 THEN 'Out of Stock'
            WHEN current_stock <= minimum_stock THEN 'Low Stock'
            ELSE 'In Stock' END as stock_status
       FROM inventory_items WHERE tenant_id=$1
       ORDER BY current_stock ASC LIMIT 15`,
      [tenantId]
    );
    return { type: 'inventory', data: result.rows };
  }

  // Helpdesk queries
  if (q.includes('ticket') || q.includes('helpdesk') || q.includes('support')) {
    const result = await pool.query(
      `SELECT ticket_number, title, priority, status, requester_name, category, created_at
       FROM helpdesk_tickets WHERE tenant_id=$1
       AND status IN ('Open','In Progress')
       ORDER BY CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END`,
      [tenantId]
    );
    return { type: 'tickets', data: result.rows };
  }

  // Risk queries
  if (q.includes('risk')) {
    const result = await pool.query(
      `SELECT risk_name, category, impact, likelihood, risk_score, status, owner
       FROM risks WHERE tenant_id=$1 AND status IN ('Open','In Progress')
       ORDER BY risk_score DESC LIMIT 10`,
      [tenantId]
    );
    return { type: 'risks', data: result.rows };
  }

  // Payroll queries
  if (q.includes('payroll') || q.includes('salary') || q.includes('payslip')) {
    const result = await pool.query(
      `SELECT month, year, total_gross, total_net, total_deductions, employee_count, status
       FROM payroll_runs WHERE tenant_id=$1
       ORDER BY year DESC, month DESC LIMIT 6`,
      [tenantId]
    );
    return { type: 'payroll', data: result.rows };
  }

  // Vendor queries
  if (q.includes('vendor') || q.includes('supplier')) {
    const result = await pool.query(
      `SELECT vendor_name, category, rating, payment_terms, status
       FROM vendors WHERE tenant_id=$1
       ORDER BY rating DESC LIMIT 10`,
      [tenantId]
    );
    return { type: 'vendors', data: result.rows };
  }

  // Contract queries
  if (q.includes('contract') || q.includes('expir')) {
    const result = await pool.query(
      `SELECT contract_name, vendor_name, value, start_date, end_date, status,
       end_date - CURRENT_DATE as days_remaining
       FROM contracts WHERE tenant_id=$1
       ORDER BY end_date ASC LIMIT 10`,
      [tenantId]
    );
    return { type: 'contracts', data: result.rows };
  }

  return null;
}

// ?? Generate AI narrative with context ????????????????????????????????????
async function generateAIResponse(
  question: string,
  context: string,
  queryData: any,
  conversationHistory: any[]
): Promise<string> {
  const systemPrompt = `You are Deemona AI Copilot, an intelligent ERP assistant for Indian businesses.
You have access to real-time business data from Deemona Enterprise Finance Suite.

${context}

INSTRUCTIONS:
- Answer questions about the business data concisely and accurately
- Use Indian number formatting (lakhs, crores) where appropriate
- Provide actionable recommendations when relevant
- If you see anomalies or risks in the data, highlight them
- Keep responses clear and business-focused
- Use rupee symbol (Rs. or ?) for monetary values
- If asked to generate a PO, leave request, or report ? confirm what data to use
- Format data in readable tables when showing lists`;

  const messages: any[] = [
    ...conversationHistory.slice(-6), // Keep last 6 messages for context
    {
      role: 'user',
      content: queryData
        ? `${question}\n\nHere is the relevant data from the database:\n${JSON.stringify(queryData.data, null, 2)}`
        : question
    }
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    system: systemPrompt,
    messages
  });

  return response.content[0].type === 'text' ? response.content[0].text : 'Unable to generate response';
}

export const aiController = {
  // ?? Original narrative endpoint (kept for compatibility) ?????????????????
  generateNarrative: async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ status: 'error', message: 'Prompt is required' });
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });
      const text = message.content?.[0]?.type === 'text' ? message.content[0].text : '';
      res.json({ status: 'success', data: { narrative: text } });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  },

  // ?? AI Copilot ? main chat endpoint ?????????????????????????????????????
  chat: async (req: Request, res: Response) => {
    const { message, conversation_id, history } = req.body;
    const tenantId = (req as any).user?.tenantId || 1;
    const userId = (req as any).user?.userId || 1;

    if (!message) return res.status(400).json({ status: 'error', message: 'Message required' });

    try {
      // Get business context
      const context = await getBusinessContext(tenantId);

      // Try to execute NL query first
      const queryData = await executeNLQuery(message, tenantId);

      // Generate AI response
      const conversationHistory = history || [];
      const aiResponse = await generateAIResponse(message, context, queryData, conversationHistory);

      // Save conversation
      let convId = conversation_id;
      if (!convId) {
        const conv = await pool.query(
          `INSERT INTO ai_conversations (user_id, tenant_id, title, messages)
           VALUES ($1,$2,$3,$4) RETURNING conversation_id`,
          [userId, tenantId, message.substring(0, 50), JSON.stringify([])]
        );
        convId = conv.rows[0].conversation_id;
      }

      // Update conversation messages
      const newMessages = [
        ...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ];
      await pool.query(
        'UPDATE ai_conversations SET messages=$1, updated_at=NOW() WHERE conversation_id=$2',
        [JSON.stringify(newMessages.slice(-20)), convId]
      );

      res.json({
        status: 'success',
        data: {
          response: aiResponse,
          conversation_id: convId,
          query_data: queryData,
          suggested_questions: getSuggestedQuestions(message)
        }
      });
    } catch (e: any) {
      console.error('[AI Copilot] Error:', e.message);
      res.status(500).json({ status: 'error', message: e.message });
    }
  },

  // ?? AI Insights ? auto-generate business insights ????????????????????????
  insights: async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenantId || 1;
    try {
      const context = await getBusinessContext(tenantId);
      const prompt = `Based on this business data, provide 5 key insights and recommendations in JSON format:
${context}

Return ONLY a JSON array like:
[
  {"type": "warning|success|info|error", "title": "...", "insight": "...", "action": "..."},
  ...
]`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
      let insights = [];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch { insights = []; }

      res.json({ status: 'success', data: { insights, generated_at: new Date() } });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  },

  // ?? Get conversation history ??????????????????????????????????????????????
  getConversations: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 1;
    const tenantId = (req as any).user?.tenantId || 1;
    try {
      const result = await pool.query(
        `SELECT conversation_id, title, created_at, updated_at
         FROM ai_conversations WHERE user_id=$1 AND tenant_id=$2
         ORDER BY updated_at DESC LIMIT 20`,
        [userId, tenantId]
      );
      res.json({ status: 'success', data: result.rows });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  },

  // ?? Get single conversation ???????????????????????????????????????????????
  getConversation: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 1;
    try {
      const result = await pool.query(
        `SELECT * FROM ai_conversations WHERE conversation_id=$1 AND user_id=$2`,
        [req.params.id, userId]
      );
      if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Not found' });
      const conv = result.rows[0];
      conv.messages = typeof conv.messages === 'string' ? JSON.parse(conv.messages) : conv.messages;
      res.json({ status: 'success', data: conv });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  },

  // ?? Generate PDF report ???????????????????????????????????????????????????
  generateReport: async (req: Request, res: Response) => {
    const { report_type, period } = req.body;
    const tenantId = (req as any).user?.tenantId || 1;

    try {
      const context = await getBusinessContext(tenantId);
      const prompt = `Generate a professional business report for ${report_type || 'monthly executive summary'} ${period ? 'for ' + period : ''}.

${context}

Format as a structured report with:
1. Executive Summary (3-4 sentences)
2. Key Metrics (bullet points with numbers)
3. Highlights & Achievements
4. Concerns & Risks
5. Recommended Actions (numbered list)

Use Indian business context and Rs. for currency.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const reportText = response.content[0].type === 'text' ? response.content[0].text : '';

      // Save report to history
      await pool.query(
        `INSERT INTO user_report_history (user_id, report_name, domain_name, notes)
         VALUES ($1,$2,$3,$4)`,
        [(req as any).user?.userId || 1, report_type || 'AI Generated Report', 'General', reportText.substring(0, 500)]
      );

      res.json({
        status: 'success',
        data: {
          report_type: report_type || 'Executive Summary',
          period: period || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          content: reportText,
          generated_at: new Date()
        }
      });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  }
};

// ?? Suggested follow-up questions ?????????????????????????????????????????
function getSuggestedQuestions(lastMessage: string): string[] {
  const q = lastMessage.toLowerCase();
  if (q.includes('revenue') || q.includes('order')) return [
    'Which customer has the highest revenue?',
    'Show me unpaid invoices over Rs. 50,000',
    'What is the month-on-month revenue trend?'
  ];
  if (q.includes('employee') || q.includes('leave')) return [
    'Who is on leave this week?',
    'Which department has the most pending leaves?',
    'Show me attendance summary for this month'
  ];
  if (q.includes('budget') || q.includes('expense')) return [
    'Which department is most over budget?',
    'Show all pending expense claims',
    'What is total spend this month?'
  ];
  if (q.includes('inventory') || q.includes('stock')) return [
    'Which items need to be reordered?',
    'What is total inventory value?',
    'Show items out of stock'
  ];
  return [
    'What is my business health summary?',
    'Show me critical alerts',
    'What should I focus on today?',
    'Generate monthly executive report'
  ];
}
