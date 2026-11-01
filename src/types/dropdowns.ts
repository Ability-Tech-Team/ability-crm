export type DropdownOption = {
  id: number;
  name: string;
  en_name?: string;
  ar_name?: string;
  is_active?: number | null;
};

export type SystemConfigOption = {
  id: number;
  name: string;
  variable_name?: string;
  system_config_id: number;
  config_list: string[] | null;
  config_value: string;
  is_active: number;
};

export type LocationDropdownOption = {
  id: number;
  name: string;
  en_name?: string;
  ar_name?: string;
  is_active?: number | null;
  location_type_id?: number | null;
  location_code?: string;
  parent_location_id: number | null;
  children: LocationDropdownOption[];
};

export type AllDropdownsResponse = {
  result: {
    menuitems?: DropdownOption[];
    privileges?: DropdownOption[];
    modules?: DropdownOption[];
    permissions?: DropdownOption[];
    departments?: DropdownOption[];
    services?: DropdownOption[];
    units?: DropdownOption[];
    statuses?: DropdownOption[];
    users?: DropdownOption[];
    positions?: DropdownOption[];
    safes?: DropdownOption[];
    gender?: DropdownOption[];
    employee_types?: DropdownOption[];
    location_types?: DropdownOption[];
    locations?: LocationDropdownOption[];
    rental_companies?: DropdownOption[];
    sister_companies?: DropdownOption[];
    unit_types?: DropdownOption[];
    company_projects?: DropdownOption[];
    marital_statuses?: DropdownOption[];
    religions?: DropdownOption[];
    customer_types?: DropdownOption[];
    ownership_types?: DropdownOption[];
    /** Owner, Partner, Guarantor, …; for owner ownerships only. */
    owner_types?: DropdownOption[];
    ticket_actions?: DropdownOption[];
    concession_ticket_reasons?: DropdownOption[];
    invoice_types?: DropdownOption[];
    ticket_statuses?: DropdownOption[];
    invoice_statuses?: DropdownOption[];
    complain_types?: DropdownOption[];
    complain_statuses?: DropdownOption[];
    request_sources?: DropdownOption[];
    system_config?: SystemConfigOption[];
    payment_types?: DropdownOption[];
    media_types?: DropdownOption[];
    id_types?: DropdownOption[];
    rental_invoice_types?: DropdownOption[];
    rental_statuses?: DropdownOption[];
    walk_in_statuses?: DropdownOption[];
    walk_in_tenant_sources?: DropdownOption[];
    owner_relative_request_statuses?: DropdownOption[];
    ownership_management_categories?: DropdownOption[];
    ownership_management_statuses?: DropdownOption[];
    unit_block_categories?: DropdownOption[];
    contact_channels?: DropdownOption[];
    [key: string]:
      | DropdownOption[]
      | LocationDropdownOption[]
      | SystemConfigOption[]
      | undefined;
  };
  success: boolean;
};
