import { query } from '../config/database';
import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface IntegrationConfig {
  source_id:   number;
  source_name: string;
  source_type: 'CRM' | 'ERP' | 'HRMS' | 'Database' | 'Custom';
  auth_type:   'oauth2' | 'apikey' | 'basic' | 'bearer';
  base_url:    string;
  config:      Record<string, any>;
  credentials: Record<string, any>;
}

export interface SyncResult {
  source_id:    number;
  source_name:  string;
  status:       'success' | 'failed' | 'partial';
  records_synced: number;
  errors:       string[];
  duration_ms:  number;
  synced_at:    Date;
}

export interface FieldMapping {
  source_field:  string;
  target_field:  string;
  transform?:    (val: any) => any;
}

// ─────────────────────────────────────────────────────────────
// BASE INTEGRATION CLASS
// ─────────────────────────────────────────────────────────────
export abstract class BaseIntegration {
  protected config:  IntegrationConfig;
  protected client:  AxiosInstance;
  protected errors:  string[] = [];

  constructor(config: IntegrationConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.base_url,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
    this.setupAuth();
  }

  protected setupAuth(): void {
    const { auth_type, credentials } = this.config;
    this.client.interceptors.request.use(cfg => {
      if (auth_type === 'bearer' || auth_type === 'oauth2') {
        cfg.headers!.Authorization = `Bearer ${credentials.access_token || credentials.token}`;
      } else if (auth_type === 'apikey') {
        cfg.headers![credentials.header_name || 'Authorization'] =
          credentials.api_key || credentials.token;
      } else if (auth_type === 'basic') {
        const encoded = Buffer.from(
          `${credentials.username}:${credentials.password}`
        ).toString('base64');
        cfg.headers!.Authorization = `Basic ${encoded}`;
      }
      return cfg;
    });

    // Token refresh on 401
    this.client.interceptors.response.use(
      res => res,
      async err => {
        if (err.response?.status === 401 && auth_type === 'oauth2') {
          await this.refreshToken();
        }
        throw err;
      }
    );
  }

  protected async refreshToken(): Promise<void> {
    // Override in subclasses for OAuth2 token refresh
  }

  abstract fetchData(entity: string, params?: Record<string, any>): Promise<any[]>;
  abstract mapRecord(record: any, entity: string): Record<string, any>;
  abstract getEntities(): string[];

  async sync(): Promise<SyncResult> {
    const start = Date.now();
    let totalSynced = 0;
    this.errors = [];

    try {
      await this.updateSyncStatus('syncing');

      for (const entity of this.getEntities()) {
        try {
          const records = await this.fetchData(entity);
          const mapped  = records.map(r => this.mapRecord(r, entity));
          await this.writeToDatabase(entity, mapped);
          totalSynced += mapped.length;
          console.log(`✅ ${this.config.source_name}: synced ${mapped.length} ${entity}`);
        } catch (err: any) {
          const msg = `Failed to sync ${entity}: ${err.message}`;
          this.errors.push(msg);
          console.error(`❌ ${this.config.source_name}: ${msg}`);
        }
      }

      const status = this.errors.length === 0 ? 'success' :
                     totalSynced > 0 ? 'partial' : 'failed';

      await this.updateSyncStatus('idle', new Date());
      await this.logSyncResult(status, totalSynced);

      return {
        source_id:      this.config.source_id,
        source_name:    this.config.source_name,
        status,
        records_synced: totalSynced,
        errors:         this.errors,
        duration_ms:    Date.now() - start,
        synced_at:      new Date(),
      };
    } catch (err: any) {
      await this.updateSyncStatus('error');
      throw err;
    }
  }

  protected async writeToDatabase(
    entity: string, records: Record<string, any>[]
  ): Promise<void> {
    if (records.length === 0) return;

    // Write to integration_logs for now
    // In production: upsert into entity-specific tables
    await query(
      `INSERT INTO integration_logs
         (source_id, entity_type, records_count, status, synced_at)
       VALUES ($1, $2, $3, 'success', NOW())
       ON CONFLICT DO NOTHING`,
      [this.config.source_id, entity, records.length]
    ).catch(() => {
      // Table may not exist yet — log only
      console.log(`[DB] Would write ${records.length} ${entity} records`);
    });
  }

  protected async updateSyncStatus(
    status: string, lastSync?: Date
  ): Promise<void> {
    await query(
      `UPDATE data_sources
       SET config = config || $1::jsonb,
           ${lastSync ? 'last_sync = $3,' : ''}
           updated_at = NOW()
       WHERE source_id = $2`,
      [
        JSON.stringify({ sync_status: status }),
        this.config.source_id,
        ...(lastSync ? [lastSync] : []),
      ]
    ).catch(() => {});
  }

  protected async logSyncResult(
    status: string, count: number
  ): Promise<void> {
    await query(
      `UPDATE data_sources
       SET last_sync = NOW(),
           config = config || $1::jsonb,
           updated_at = NOW()
       WHERE source_id = $2`,
      [
        JSON.stringify({
          last_sync_status:  status,
          last_sync_count:   count,
          last_sync_errors:  this.errors,
        }),
        this.config.source_id,
      ]
    ).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────
// SALESFORCE INTEGRATION
// ─────────────────────────────────────────────────────────────
export class SalesforceIntegration extends BaseIntegration {

  getEntities(): string[] {
    return ['Account', 'Opportunity', 'Contact', 'Lead', 'Report'];
  }

  async fetchData(entity: string, params: Record<string, any> = {}): Promise<any[]> {
    const queries: Record<string, string> = {
      Account:     'SELECT Id,Name,Industry,AnnualRevenue,NumberOfEmployees,CreatedDate FROM Account LIMIT 200',
      Opportunity: 'SELECT Id,Name,StageName,Amount,CloseDate,AccountId,Probability FROM Opportunity LIMIT 200',
      Contact:     'SELECT Id,FirstName,LastName,Email,AccountId,Title FROM Contact LIMIT 200',
      Lead:        'SELECT Id,FirstName,LastName,Email,Company,Status,LeadSource FROM Lead LIMIT 200',
      Report:      'SELECT Id,Name,FolderName,LastRunDate FROM Report LIMIT 50',
    };

    const soql = queries[entity] || `SELECT Id,Name FROM ${entity} LIMIT 100`;
    const res  = await this.client.get(`/services/data/v58.0/query`, {
      params: { q: soql },
    });
    return res.data?.records || [];
  }

  mapRecord(record: any, entity: string): Record<string, any> {
    const maps: Record<string, FieldMapping[]> = {
      Account: [
        { source_field: 'Id',                target_field: 'external_id' },
        { source_field: 'Name',              target_field: 'name' },
        { source_field: 'Industry',          target_field: 'industry' },
        { source_field: 'AnnualRevenue',     target_field: 'annual_revenue' },
        { source_field: 'NumberOfEmployees', target_field: 'employees' },
      ],
      Opportunity: [
        { source_field: 'Id',          target_field: 'external_id' },
        { source_field: 'Name',        target_field: 'name' },
        { source_field: 'StageName',   target_field: 'stage' },
        { source_field: 'Amount',      target_field: 'amount' },
        { source_field: 'CloseDate',   target_field: 'close_date' },
        { source_field: 'Probability', target_field: 'probability' },
      ],
    };

    const mapping = maps[entity] || [];
    const result: Record<string, any> = { source: 'salesforce', entity };
    mapping.forEach(m => {
      result[m.target_field] = m.transform
        ? m.transform(record[m.source_field])
        : record[m.source_field];
    });
    return result;
  }

  async refreshToken(): Promise<void> {
    const { client_id, client_secret, refresh_token, instance_url } = this.config.credentials;
    const res = await axios.post(`${instance_url}/services/oauth2/token`, null, {
      params: {
        grant_type:    'refresh_token',
        client_id,
        client_secret,
        refresh_token,
      },
    });
    this.config.credentials.access_token = res.data.access_token;
    await query(
      `UPDATE data_sources SET credentials = credentials || $1::jsonb WHERE source_id = $2`,
      [JSON.stringify({ access_token: res.data.access_token }), this.config.source_id]
    ).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────
// HUBSPOT INTEGRATION
// ─────────────────────────────────────────────────────────────
export class HubSpotIntegration extends BaseIntegration {

  getEntities(): string[] {
    return ['contacts', 'companies', 'deals', 'reports'];
  }

  async fetchData(entity: string, params: Record<string, any> = {}): Promise<any[]> {
    const endpoints: Record<string, string> = {
      contacts:  '/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,company,jobtitle',
      companies: '/crm/v3/objects/companies?limit=100&properties=name,industry,annualrevenue,numberofemployees',
      deals:     '/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,pipeline',
      reports:   '/analytics/v2/reports',
    };

    const endpoint = endpoints[entity];
    if (!endpoint) return [];

    const res = await this.client.get(endpoint);
    return res.data?.results || res.data?.data || [];
  }

  mapRecord(record: any, entity: string): Record<string, any> {
    const props = record.properties || record;
    const maps: Record<string, any> = {
      contacts: {
        external_id: record.id,
        first_name:  props.firstname,
        last_name:   props.lastname,
        email:       props.email,
        company:     props.company,
        title:       props.jobtitle,
        source:      'hubspot',
      },
      companies: {
        external_id:    record.id,
        name:           props.name,
        industry:       props.industry,
        annual_revenue: props.annualrevenue,
        employees:      props.numberofemployees,
        source:         'hubspot',
      },
      deals: {
        external_id: record.id,
        name:        props.dealname,
        amount:      props.amount,
        stage:       props.dealstage,
        close_date:  props.closedate,
        pipeline:    props.pipeline,
        source:      'hubspot',
      },
    };
    return maps[entity] || { ...props, external_id: record.id, source: 'hubspot' };
  }
}

// ─────────────────────────────────────────────────────────────
// SAP S/4HANA INTEGRATION
// ─────────────────────────────────────────────────────────────
export class SAPIntegration extends BaseIntegration {

  getEntities(): string[] {
    return ['GLAccounts', 'CostCenters', 'ProfitCenters', 'Vendors', 'Customers'];
  }

  async fetchData(entity: string, params: Record<string, any> = {}): Promise<any[]> {
    const endpoints: Record<string, string> = {
      GLAccounts:    '/sap/opu/odata/sap/API_GLACCOUNTINCHARTOFACCOUNTS/A_GLAccountInChartOfAccounts?$top=100&$format=json',
      CostCenters:   '/sap/opu/odata/sap/API_COSTCENTER_SRV/A_CostCenter?$top=100&$format=json',
      ProfitCenters: '/sap/opu/odata/sap/API_PROFITCENTER_SRV/A_ProfitCenter?$top=100&$format=json',
      Vendors:       '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$filter=BusinessPartnerCategory%20eq%20%272%27&$top=100&$format=json',
      Customers:     '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$filter=BusinessPartnerCategory%20eq%20%271%27&$top=100&$format=json',
    };

    const res = await this.client.get(endpoints[entity]);
    return res.data?.d?.results || res.data?.value || [];
  }

  mapRecord(record: any, entity: string): Record<string, any> {
    const maps: Record<string, any> = {
      GLAccounts: {
        external_id:  record.GLAccount,
        name:         record.GLAccountName,
        type:         record.GLAccountType,
        chart:        record.ChartOfAccounts,
        source:       'sap',
        entity,
      },
      CostCenters: {
        external_id:   record.CostCenter,
        name:          record.CostCenterName,
        company_code:  record.CompanyCode,
        valid_from:    record.ValidityStartDate,
        source:        'sap',
        entity,
      },
    };
    return maps[entity] || { ...record, source: 'sap', entity };
  }
}

// ─────────────────────────────────────────────────────────────
// WORKDAY INTEGRATION
// ─────────────────────────────────────────────────────────────
export class WorkdayIntegration extends BaseIntegration {

  getEntities(): string[] {
    return ['workers', 'organizations', 'payrollResults'];
  }

  async fetchData(entity: string, params: Record<string, any> = {}): Promise<any[]> {
    const { tenant } = this.config.config;
    const endpoints: Record<string, string> = {
      workers:        `/ccx/service/${tenant}/Human_Resources/v42.0/Get_Workers`,
      organizations:  `/ccx/service/${tenant}/Human_Resources/v42.0/Get_Organizations`,
      payrollResults: `/ccx/service/${tenant}/Payroll/v40.0/Get_Payroll_Results`,
    };

    const res = await this.client.post(endpoints[entity], {
      Request_References: {},
      Request_Criteria:   {},
      Response_Filter:    { Count: 100, Skip: 0 },
    });
    return res.data?.Response_Data || [];
  }

  mapRecord(record: any, entity: string): Record<string, any> {
    return {
      external_id: record.Worker_Reference?.ID?.[0]?._ || record.ID,
      name:        `${record.Personal_Data?.Name_Data?.Legal_Name_Data?.Name_Detail_Data?.First_Name} ${record.Personal_Data?.Name_Data?.Legal_Name_Data?.Name_Detail_Data?.Last_Name}`,
      email:       record.Personal_Data?.Contact_Data?.Email_Address_Data?.[0]?.Email_Address,
      department:  record.Organization_Data?.Organization_Reference?.[0]?.Organization_Name,
      source:      'workday',
      entity,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// INTEGRATION FACTORY
// ─────────────────────────────────────────────────────────────
export class IntegrationFactory {
  static create(config: IntegrationConfig): BaseIntegration {
    switch (config.source_name.toLowerCase()) {
      case 'salesforce':
      case 'salesforce crm':
        return new SalesforceIntegration(config);
      case 'hubspot':
      case 'hubspot crm':
        return new HubSpotIntegration(config);
      case 'sap':
      case 'sap s/4hana':
        return new SAPIntegration(config);
      case 'workday':
      case 'workday hcm':
        return new WorkdayIntegration(config);
      default:
        throw new Error(`No integration available for: ${config.source_name}`);
    }
  }

  static getSupportedPlatforms(): string[] {
    return ['Salesforce CRM', 'HubSpot CRM', 'SAP S/4HANA', 'Workday HCM'];
  }
}
