'use server';
import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@pod/db';

export async function setApprovalStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const db = createServiceClient();

  await db.from('designs').update({ approval_status: status }).eq('id', id);

  if (status === 'approved') {
    // Fetch the design so we can seed the product title from the slogan.
    const { data: design } = await db
      .from('designs')
      .select('id, slogan')
      .eq('id', id)
      .single();

    if (design) {
      // Check if a product already exists for this design to keep this idempotent.
      const { count } = await db
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('design_id', design.id);

      if ((count ?? 0) === 0) {
        await db.from('products').insert({
          design_id: design.id,
          title: design.slogan ?? 'Untitled Product',
          price: 24.99,
          blank: 'bella-canvas-3001',
          approval_status: 'pending',
        });
      }
    }

    revalidatePath('/products');
  }

  revalidatePath('/designs');
}
