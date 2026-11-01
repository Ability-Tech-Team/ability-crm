export type ContactChannelId = 1 | 2;

export function normalizeContactChannelId(
  value: unknown,
): ContactChannelId | undefined {
  const parsed = typeof value === 'string' ? Number(value) : value;

  return parsed === 1 || parsed === 2 ? parsed : undefined;
}

export function getContactChannelPayload(
  value: unknown,
): { contact_channel_id?: ContactChannelId } {
  const contactChannelId = normalizeContactChannelId(value);

  return contactChannelId ? { contact_channel_id: contactChannelId } : {};
}
