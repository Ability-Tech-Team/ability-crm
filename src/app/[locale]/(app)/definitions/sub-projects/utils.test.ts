import { describe, expect, it } from 'vitest';
import {
  buildSubProjectPayload,
  getSubProjectInitialValues,
  matchesSubProjectSearch,
  toCreateSubProjectDto,
  toUpdateSubProjectDto,
} from './utils';

const row = {
  id: 9, project_id: 5, project_name: 'North', project_code: 'B1', name: 'Block 1',
  en_name: 'Block 1', ar_name: 'مبنى 1', is_default: false, is_active: 1,
};

describe('the sub-project form', () => {
  it('sends the project when adding, else the listed project', () => {
    const values = { project_id: '7', project_code: ' B2 ', en_name: 'Block 2', ar_name: 'مبنى 2' };
    expect(toCreateSubProjectDto(buildSubProjectPayload(values, null), 5)).toEqual({
      project_id: 7, project_code: 'B2', en_name: 'Block 2', ar_name: 'مبنى 2',
    });
    expect(toCreateSubProjectDto(buildSubProjectPayload({ ...values, project_id: '' }, null), 5).project_id).toBe(5);
  });

  it('never moves a sub-project to another project', () => {
    const payload = buildSubProjectPayload(
      { project_id: '7', project_code: 'B1', en_name: 'Block one', ar_name: 'مبنى 1' },
      row,
    );
    expect(payload).not.toHaveProperty('project_id');
    expect(toUpdateSubProjectDto({ ...payload, project_id: 7 })).toEqual({
      project_code: 'B1', en_name: 'Block one', ar_name: 'مبنى 1',
    });
  });

  it('starts at the listed project, or at the row being edited', () => {
    expect(getSubProjectInitialValues(null, 5)).toMatchObject({ project_id: '5', project_code: '' });
    expect(getSubProjectInitialValues(row, 2)).toEqual({
      project_id: '5', project_code: 'B1', en_name: 'Block 1', ar_name: 'مبنى 1',
    });
  });

  it('searches the code and both names', () => {
    expect(matchesSubProjectSearch(row, 'b1')).toBe(true);
    expect(matchesSubProjectSearch(row, 'block')).toBe(true);
    expect(matchesSubProjectSearch(row, 'مبنى')).toBe(true);
    expect(matchesSubProjectSearch(row, ' ')).toBe(true);
    expect(matchesSubProjectSearch(row, 'tower')).toBe(false);
  });
});
