import { SignIn, type SignInValues } from '@lepide/ds-react';

/* Sign in (DESIGN.md §4.2): the whole page, no console shell, exactly the prototype's sign-in. <SignIn> renders the
   glass card, the form with inline validation, the loading and done states, and the illustration panel: the
   particle animation that forms the Lepide mark and each module's icon, with the prototype's seven slides.
   The app only supplies what happens on submit (and the forgot-password link). */

/** Stand-in for your auth call: rejects with a message to show it under the password field. */
const signIn = ({ password }: SignInValues) => new Promise<void>((resolve, reject) =>
  window.setTimeout(() => (password === 'wrong' ? reject(new Error('Wrong email or password.')) : resolve()), 1100));

export default function SignInScreen() {
  return <SignIn onSubmit={signIn} forgotPasswordTo="/forgot-password" />;
}
