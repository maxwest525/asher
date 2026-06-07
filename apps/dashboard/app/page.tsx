import { CommandButtons } from './command-buttons';

export default function DashboardPage() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '3rem', maxWidth: 720, margin: '0 auto' }}>
      <h1>POD Command Center</h1>
      <p>
        Each button emits an event to <code>apps/api</code> (Inngest), which runs the corresponding
        production agent workflow. Buttons are thin triggers — no business logic lives here.
      </p>
      <CommandButtons />
    </main>
  );
}
