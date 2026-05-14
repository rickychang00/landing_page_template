'use server';

import { serverApiClient } from '@/lib/api-client';

export async function updateMember(id: string, data: Record<string, unknown>) {
  return serverApiClient(`/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
