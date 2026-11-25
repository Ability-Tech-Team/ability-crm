import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { setApiAddresses } from '@/src/lib/apiConfig';
import api from '@/src/lib/http';
import {
  getProjects,
  getWorkingProjects,
  toAccessibleProjects,
  toProjectRows,
  toSubProjectRows,
} from './projects';

function answer(
  data: unknown,
  seen?: (config: InternalAxiosRequestConfig) => void,
): AxiosAdapter {
  return async (config) => {
    seen?.(config);
    return { data, status: 200, statusText: '', headers: {}, config };
  };
}

afterEach(() => {
  api.defaults.adapter = undefined;
});

describe('the projects answers', () => {
  it('reads the accessible projects, never the shared "*" project', () => {
    expect(
      toAccessibleProjects([
        { id: 1, name: '*', en_name: '*', ar_name: '*', is_active: 1 },
        { id: 2, name: 'Main', en_name: 'Main', ar_name: 'رئيسي', is_active: 1 },
        { id: 5, name: null, en_name: 'North', ar_name: 'شمال', is_active: 0 },
      ]),
    ).toEqual([
      { id: 2, name: 'Main', active: true },
      { id: 5, name: 'North', active: false },
    ]);
  });

  it('refuses an answer of another shape', () => {
    expect(() => toAccessibleProjects({ projects: [] })).toThrow();
    expect(() => toProjectRows([])).toThrow();
  });

  it('reads the project rows with their units and occupancy', () => {
    expect(
      toProjectRows({
        total_count: 1,
        total_pages: 1,
        projects: [
          {
            id: 5, name: 'North', en_name: 'North', ar_name: 'شمال', company_code: 'AB',
            project_code: 'NRT', is_active: 1, total_units: 12, occupancy: 41.5,
          },
        ],
      }),
    ).toEqual([
      {
        id: 5, name: 'North', en_name: 'North', ar_name: 'شمال', company_code: 'AB',
        project_code: 'NRT', is_active: 1, total_units: 12, occupancy: 41.5,
      },
    ]);
  });

  it('reads the sub-project rows, the default one flagged', () => {
    expect(
      toSubProjectRows({
        sub_projects: [
          { id: 1, project_id: 2, project_name: 'Main', project_code: 'DEF', name: null, en_name: null, ar_name: null, is_default: true, is_active: 1 },
          { id: 9, project_id: 2, project_code: 'B1', name: 'Block 1', en_name: 'Block 1', ar_name: 'مبنى 1', is_default: false, is_active: 0 },
        ],
      }),
    ).toEqual([
      { id: 1, project_id: 2, project_name: 'Main', project_code: 'DEF', name: 'DEF', en_name: null, ar_name: null, is_default: true, is_active: 1 },
      { id: 9, project_id: 2, project_name: null, project_code: 'B1', name: 'Block 1', en_name: 'Block 1', ar_name: 'مبنى 1', is_default: false, is_active: 0 },
    ]);
  });

  it('lists every project at once, with the search when one is given', async () => {
    setApiAddresses({ baseUrl: 'http://172.20.1.141:9999', socketOrigin: 'http://172.20.1.141:9999' });
    let seen: InternalAxiosRequestConfig | undefined;
    api.defaults.adapter = answer(
      { result: { total_count: 0, total_pages: 0, projects: [] }, success: true, statusCode: 200 },
      (config) => {
        seen = config;
      },
    );
    await expect(getProjects({ search: ' North ' })).resolves.toEqual([]);
    expect(seen?.url).toBe('/projects');
    expect(seen?.params).toEqual({ search: 'North', page: 1, limit: 1000 });
  });
});

describe('the projects the header offers', () => {
  it('falls back to the Super Admin\'s projects list where the API has no accessible route', async () => {
    setApiAddresses({ baseUrl: 'http://172.20.1.141:9999', socketOrigin: 'http://172.20.1.141:9999' });
    const urls: string[] = [];
    api.defaults.adapter = async (config) => {
      urls.push(String(config.url));
      // An API without the route reads it as GET /projects/:id.
      const data = config.url === '/projects/accessible'
        ? { result: { message: 'Project not found', message_code: 'PROJECT_NOT_FOUND' }, success: false, statusCode: 404 }
        : {
            result: {
              total_count: 1,
              total_pages: 1,
              projects: [{ id: 5, name: 'North', en_name: 'North', ar_name: 'شمال', company_code: 'AB', project_code: 'NRT', is_active: 1, total_units: 0, occupancy: 0 }],
            },
            success: true,
            statusCode: 200,
          };
      return { data, status: 200, statusText: '', headers: {}, config };
    };
    await expect(getWorkingProjects()).resolves.toEqual([{ id: 5, name: 'North', active: true }]);
    expect(urls).toEqual(['/projects/accessible', '/projects']);
  });
});
