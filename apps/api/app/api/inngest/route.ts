import { serve } from 'inngest/next';
import { inngest } from '../../../src/inngest/client';
import { functions } from '../../../src/inngest/functions';

// Inngest registers and invokes the workflow functions through this route.
export const { GET, POST, PUT } = serve({ client: inngest, functions });
