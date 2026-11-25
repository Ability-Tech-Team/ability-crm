import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setApiAddresses } from "@/src/lib/apiConfig";
import api from "@/src/lib/http";
import { useProjectScopeStore } from "@/src/store/useProjectScopeStore";
import { createRole } from "./privileges";
import { updateRole } from "./roles";

type Call = { method?: string; url?: string; data: unknown };

/** Answers each call with the envelope `reply` gives, and records what was sent. */
function api_(calls: Call[], reply: (call: Call) => unknown): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    const call = {
      method: config.method,
      url: config.url,
      data:
        typeof config.data === "string" ? JSON.parse(config.data) : config.data,
    };
    calls.push(call);
    return {
      data: reply(call),
      status: 200,
      statusText: "",
      headers: {},
      config,
    };
  };
}

const ok = (result: unknown = {}) => ({
  success: true,
  statusCode: 200,
  result,
});
const refused = (code: string) => ({
  success: false,
  statusCode: 403,
  result: { message_code: code, message: code },
});

const privileges = [
  { menuitem_id: 113, privilege_id: 1, status: 1 },
  { menuitem_id: 112, privilege_id: 13, status: 1 },
];

beforeEach(() => {
  setApiAddresses({
    baseUrl: "http://127.0.0.1:3003/crm",
  });
});

afterEach(() => {
  api.defaults.adapter = undefined;
  useProjectScopeStore.setState({ projectId: null, projects: [] });
});

describe("createRole", () => {
  it("creates the role, then grants its privileges to the new role", async () => {
    const calls: Call[] = [];
    api.defaults.adapter = api_(calls, (call) =>
      call.url === "/roles"
        ? ok({ id: "role-1", message: "ROLE_CREATED_SUCCESSFULLY" })
        : ok([]),
    );

    const response = await createRole({
      en_name: "Agents",
      ar_name: "وكلاء",
      privileges,
    });

    expect(response.result.id).toBe("role-1");
    expect(calls).toEqual([
      {
        method: "post",
        url: "/roles",
        data: { en_name: "Agents", ar_name: "وكلاء" },
      },
      {
        method: "post",
        url: "/roles/assign-privilege-to-role",
        data: {
          privileges: [
            { role_id: "role-1", menuitem_id: 113, privilege_id: 1, status: 1 },
            {
              role_id: "role-1",
              menuitem_id: 112,
              privilege_id: 13,
              status: 1,
            },
          ],
        },
      },
    ]);
  });

  it("removes the new role again when its privileges are refused", async () => {
    const calls: Call[] = [];
    api.defaults.adapter = api_(calls, (call) => {
      if (call.url === "/roles") return ok({ id: "role-2" });
      if (call.url === "/roles/assign-privilege-to-role")
        return refused("CANNOT_GRANT_UNHELD_PRIVILEGE");
      return ok();
    });

    await expect(
      createRole({ en_name: "Agents", ar_name: "وكلاء", privileges }),
    ).rejects.toMatchObject({
      code: "CANNOT_GRANT_UNHELD_PRIVILEGE",
    });
    expect(calls.map((call) => call.url)).toEqual([
      "/roles",
      "/roles/assign-privilege-to-role",
      "/roles/update/role-2",
    ]);
    expect(calls[2].data).toEqual({ is_deleted: 1 });
  });

  it("sends the Super Admin's project on both calls", async () => {
    useProjectScopeStore.setState({ projectId: 7, projects: [] });
    const calls: Call[] = [];
    api.defaults.adapter = api_(calls, (call) =>
      call.url === "/roles" ? ok({ id: "role-3" }) : ok([]),
    );

    await createRole({ en_name: "Agents", ar_name: "وكلاء", privileges });

    expect(
      calls.map((call) => (call.data as { project_id?: number }).project_id),
    ).toEqual([7, 7]);
  });
});

describe("updateRole", () => {
  it("saves the names, then the privileges granted and taken back", async () => {
    const calls: Call[] = [];
    api.defaults.adapter = api_(calls, () => ok());

    await updateRole("role-4", {
      en_name: "Agents",
      ar_name: "وكلاء",
      privileges: [
        { menuitem_id: 113, privilege_id: 1, status: 1 },
        { menuitem_id: 112, privilege_id: 13, status: 0 },
      ],
    });

    expect(calls).toEqual([
      {
        method: "post",
        url: "/roles/update/role-4",
        data: { en_name: "Agents", ar_name: "وكلاء" },
      },
      {
        method: "post",
        url: "/roles/assign-privilege-to-role",
        data: {
          privileges: [
            { role_id: "role-4", menuitem_id: 113, privilege_id: 1, status: 1 },
            {
              role_id: "role-4",
              menuitem_id: 112,
              privilege_id: 13,
              status: 0,
            },
          ],
        },
      },
    ]);
  });
});
