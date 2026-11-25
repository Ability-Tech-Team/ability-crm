import { describe, expect, it } from 'vitest';
import {
  applyProjectScope,
  isProjectScopedRoute,
  routePath,
  withScopedBody,
  withScopedParams,
} from './projectScopeRequest';

describe('routePath', () => {
  it('drops the origin, the query and the slashes around the route', () => {
    expect(routePath('https://api.example.test/crm/orders/tickets?x=1')).toBe('/crm/orders/tickets');
    expect(routePath('orders/tickets/')).toBe('/orders/tickets');
    expect(routePath('/projects/units#top')).toBe('/projects/units');
    expect(routePath(undefined)).toBe('/');
  });
});

describe('isProjectScopedRoute', () => {
  it('takes the project on the routes that read or write a project\'s records', () => {
    for (const url of [
      '/projects/units',
      '/projects/unit',
      '/projects/units/update/5',
      '/projects/unit-blocks',
      '/orders/tickets/7',
      '/customers/update/3',
      '/definitions/all-dropdowns',
      '/employees',
      '/roles',
      '/imports',
      '/imports/9/errors',
      '/rentals/reservations/4/check-in',
      '/definitions/project-system-configs/update',
      '/definitions/erp-account-code-services',
      '/definitions/search/departments',
    ]) {
      expect(isProjectScopedRoute(url)).toBe(true);
    }
  });

  it('leaves out the routes without a project', () => {
    for (const url of [
      '/auth/change-password',
      '/auth/logout',
      '/branding',
      '/support/requests',
      '/projects',
      '/projects/accessible',
      '/projects/12',
      '/sub-projects',
      '/sub-projects/3',
      '/roles/get-role-privileges',
      '/imports/unit-debts/template',
      '/module-logs',
      '/definitions/erp-account-codes',
      '/definitions/erp-account-codes/update/4',
      '/definitions/privileges',
      '/definitions/contact-channels',
      '/',
    ]) {
      expect(isProjectScopedRoute(url)).toBe(false);
    }
  });
});

describe('withScopedParams', () => {
  it('adds the project to a query that names none', () => {
    expect(withScopedParams(undefined, 4)).toEqual({ project_id: 4 });
    expect(withScopedParams({ page: 1, project_id: undefined }, 4)).toEqual({ page: 1, project_id: 4 });
    expect(withScopedParams({ project_id: '' }, 4)).toEqual({ project_id: 4 });
  });

  it('keeps the project the caller named', () => {
    const params = { page: 1, project_id: 9 };
    expect(withScopedParams(params, 4)).toBe(params);
    const search = new URLSearchParams({ project_id: '9' });
    expect(withScopedParams(search, 4)).toBe(search);
  });

  it('adds it to URLSearchParams without changing the caller\'s copy', () => {
    const search = new URLSearchParams({ page: '2' });
    const scoped = withScopedParams(search, 4) as URLSearchParams;
    expect(scoped.get('project_id')).toBe('4');
    expect(search.has('project_id')).toBe(false);
  });
});

describe('withScopedBody', () => {
  it('adds the project to a JSON body, or makes one', () => {
    expect(withScopedBody(undefined, 4)).toEqual({ project_id: 4 });
    expect(withScopedBody({ notes: 'x' }, 4)).toEqual({ notes: 'x', project_id: 4 });
    expect(withScopedBody({ notes: 'x', project_id: null }, 4)).toEqual({ notes: 'x', project_id: 4 });
  });

  it('keeps the project the caller named', () => {
    const body = { notes: 'x', project_id: 9 };
    expect(withScopedBody(body, 4)).toBe(body);
  });

  it('adds a multipart field once', () => {
    const form = new FormData();
    form.append('unit_id', '3');
    withScopedBody(form, 4);
    expect(form.getAll('project_id')).toEqual(['4']);

    const named = new FormData();
    named.append('project_id', '9');
    withScopedBody(named, 4);
    expect(named.getAll('project_id')).toEqual(['9']);
  });

  it('leaves a body it can\'t read unchanged', () => {
    expect(withScopedBody('{"a":1}', 4)).toBe('{"a":1}');
    const list = [{ id: 1 }];
    expect(withScopedBody(list, 4)).toBe(list);
  });
});

describe('applyProjectScope', () => {
  it('puts a read\'s project in the query and a write\'s in the body', () => {
    expect(applyProjectScope({ method: 'get', url: '/orders/tickets', params: { page: 1 } }, 4))
      .toEqual({ method: 'get', url: '/orders/tickets', params: { page: 1, project_id: 4 } });
    expect(applyProjectScope({ method: 'post', url: '/orders/tickets/7/update', data: { notes: 'x' } }, 4))
      .toEqual({ method: 'post', url: '/orders/tickets/7/update', data: { notes: 'x', project_id: 4 } });
    const action: { method: string; url: string; data?: unknown } = {
      method: 'post',
      url: '/customers/owner-relative-requests/3/accept',
    };
    expect(applyProjectScope(action, 4).data).toEqual({ project_id: 4 });
  });

  it('changes nothing without a scope, on a route without a project, or when the URL names one', () => {
    const config = { method: 'get', url: '/orders/tickets', params: { page: 1 } };
    expect(applyProjectScope(config, undefined)).toEqual({ method: 'get', url: '/orders/tickets', params: { page: 1 } });
    expect(applyProjectScope({ method: 'get', url: '/projects/accessible' }, 4)).toEqual({ method: 'get', url: '/projects/accessible' });
    expect(applyProjectScope({ method: 'post', url: '/auth/logout' }, 4)).toEqual({ method: 'post', url: '/auth/logout' });
    expect(applyProjectScope({ method: 'get', url: '/orders/tickets?project_id=9' }, 4))
      .toEqual({ method: 'get', url: '/orders/tickets?project_id=9' });
  });
});
