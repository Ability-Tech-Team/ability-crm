import { describe, expect, it } from 'vitest';
import {
  buildProjectPayload,
  getProjectInitialValues,
  toCreateProjectDto,
  toUpdateProjectDto,
} from './utils';

const row = {
  id: 5, name: 'North', en_name: 'North', ar_name: 'شمال', company_code: 'AB',
  project_code: 'NRT', is_active: 1, total_units: 0, occupancy: 0,
};

describe('the project form', () => {
  it('sends the project code when adding, trimmed', () => {
    const payload = buildProjectPayload(
      { en_name: ' North ', ar_name: 'شمال', company_code: ' AB ', project_code: ' NRT ' },
      null,
    );
    expect(payload).toEqual({ en_name: 'North', ar_name: 'شمال', company_code: 'AB', project_code: 'NRT' });
    expect(toCreateProjectDto({ ...payload, is_active: 1 })).toEqual({ ...payload, is_active: 1 });
  });

  it('never sends the project code when editing, which the API refuses', () => {
    const payload = buildProjectPayload(
      { en_name: 'North 2', ar_name: 'شمال', company_code: 'AB', project_code: 'OTHER' },
      row,
    );
    expect(payload).not.toHaveProperty('project_code');
    expect(toUpdateProjectDto({ ...payload, project_code: 'X', is_active: 0 })).toEqual({
      en_name: 'North 2', ar_name: 'شمال', company_code: 'AB', is_active: 0,
    });
  });

  it('starts empty, or at the row being edited', () => {
    expect(getProjectInitialValues(null)).toEqual({ en_name: '', ar_name: '', company_code: '', project_code: '' });
    expect(getProjectInitialValues(row)).toEqual({ en_name: 'North', ar_name: 'شمال', company_code: 'AB', project_code: 'NRT' });
  });
});
