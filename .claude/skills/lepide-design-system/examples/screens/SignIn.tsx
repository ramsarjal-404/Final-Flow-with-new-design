import { SignIn, type SignInSlide, type SignInValues } from '@lepide/ds-react';

/* Sign in (DESIGN.md §4.2): the whole page, no console shell. <SignIn> renders the glass card, the form with
   inline validation, the loading and done states, and the illustration panel with highlight slides.
   The app only supplies the copy, the links and what happens on submit. */

const SLIDES: SignInSlide[] = [
  { kicker: 'Lepide Detect', title: 'Spot unusual activity before it becomes a breach',
    text: 'Real-time alerts on mass deletions, permission changes and logons from unusual places.' },
  { kicker: 'Lepide Auditor', title: 'Know who changed what, where and when',
    text: 'Readable audit trails for Active Directory, file servers, Exchange Online and SQL Server.' },
  { kicker: 'Lepide Protect', title: 'Close open access to sensitive data',
    text: 'Find files shared with Everyone and remove excessive permissions in a few clicks.' },
];

/** Stand-in for your auth call: rejects with a message to show it under the password field. */
const signIn = ({ password }: SignInValues) => new Promise<void>((resolve, reject) =>
  window.setTimeout(() => (password === 'wrong' ? reject(new Error('Wrong email or password.')) : resolve()), 1100));

export default function SignInScreen() {
  return (
    <SignIn
      onSubmit={signIn}
      subtitle="Use your Lepide account or your corp.lepide.local credentials."
      forgotPasswordTo="/forgot-password"
      requestAccessTo="/request-access"
      slides={SLIDES}
    />
  );
}
