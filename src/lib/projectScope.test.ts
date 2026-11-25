import { afterEach, describe, expect, it } from 'vitest';
import { useProjectScopeStore } from '@/src/store/useProjectScopeStore';
import { projectFilterParam } from './projectFilter';
import {
  clearProjectScopes,
  pickScopeProject,
  projectScopeParam,
  projectScopeStorageKey,
  readStoredProjectScope,
  storeProjectScope,
} from './projectScope';

const projects = [
  { id: 2, name: 'Main', active: true },
  { id: 5, name: 'North', active: true },
  { id: 7, name: 'Closed', active: false },
];

function memoryStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

afterEach(() => {
  useProjectScopeStore.setState({ projectId: null, projects: [] });
});

describe('picking the project the Super Admin works in', () => {
  it('keeps the stored choice while it is an active project', () => {
    expect(pickScopeProject(projects, 5, 2)).toBe(5);
  });

  it('falls back to the sign-in project, then the first active project', () => {
    expect(pickScopeProject(projects, 7, 2)).toBe(2);
    expect(pickScopeProject(projects, null, 2)).toBe(2);
    expect(pickScopeProject(projects, 99, 7)).toBe(2);
  });

  it('uses the sign-in project when the list could not load', () => {
    expect(pickScopeProject([], 5, 2)).toBe(2);
  });
});

describe('the project a call sends', () => {
  it('sends nothing for everyone but the Super Admin', () => {
    expect(projectScopeParam()).toEqual({});
    expect(projectFilterParam('')).toBeUndefined();
  });

  it('keeps a project the caller names, for everyone', () => {
    expect(projectScopeParam(9)).toEqual({ project_id: 9 });
    expect(projectScopeParam('9')).toEqual({ project_id: 9 });
  });

  it('sends the Super Admin’s project when the caller names none', () => {
    useProjectScopeStore.setState({ projectId: 5, projects });
    expect(projectScopeParam()).toEqual({ project_id: 5 });
    expect(projectScopeParam('')).toEqual({ project_id: 5 });
    expect(projectScopeParam(2)).toEqual({ project_id: 2 });
    expect(projectFilterParam('')).toBe(5);
    expect(projectFilterParam('2')).toBe(2);
  });
});

describe('keeping the choice for the tab', () => {
  it('stores it per employee and clears every employee’s choice', () => {
    const storage = memoryStorage({ 'crm-assistant:e1': 'chat' });
    storeProjectScope(storage, 'e1', 5);
    storeProjectScope(storage, 'e2', 2);
    expect(storage.getItem(projectScopeStorageKey('e1'))).toBe('5');
    expect(readStoredProjectScope(storage, 'e1')).toBe(5);
    expect(readStoredProjectScope(storage, 'nobody')).toBeNull();

    clearProjectScopes(storage);
    expect([...storage.map.keys()]).toEqual(['crm-assistant:e1']);
  });

  it('reads a broken value as no choice', () => {
    expect(readStoredProjectScope(memoryStorage({ [projectScopeStorageKey('e1')]: 'x' }), 'e1')).toBeNull();
    expect(readStoredProjectScope(null, 'e1')).toBeNull();
  });
});
