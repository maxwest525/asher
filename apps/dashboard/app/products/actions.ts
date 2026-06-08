'use server';
import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@pod/db';

export async function setProductApprovalStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const db = createServiceClient();
  await db.from('products').update({ approval_status: status }).eq('id', id);
  revalidatePath('/products');
}
