import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../cloud/supabaseClient.js';

const ENABLE_SOCIAL = import.meta.env.VITE_ENABLE_SOCIAL_AUTH === 'true';
const REDIRECT_TO = window.location.origin + import.meta.env.BASE_URL;

export default function AuthPanel({ user, loading, onSessionError }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (user) setMessage(''); }, [user?.id]);

  async function sendMagicLink(event) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: REDIRECT_TO, shouldCreateUser: true },
      });
      if (error) throw error;
      setMessage('Check your email for your sign-in link. Also check Spam. Do not share the link.');
    } catch (error) {
      setMessage('Unable to send link: ' + error.message);
    } finally { setBusy(false); }
  }

  async function socialLogin(provider) {
    if (!supabase || !ENABLE_SOCIAL || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider, options: { redirectTo: REDIRECT_TO },
      });
      if (error) throw error;
    } catch (error) {
      setMessage('Unable to sign in: ' + error.message);
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMessage('You have signed out.');
    } catch (error) {
      onSessionError?.(error.message);
    } finally { setBusy(false); }
  }

  return <section className="cloud-panel" aria-label="Aerastro account">
    <div className="cloud-panel-heading"><h2>◈ Aerastro 3D Account</h2><span>v0.4.0 preview</span></div>
    {!supabaseConfigured ? <p role="status">Cloud sign-in has not been configured. Add the public Supabase URL and publishable key to the build environment. Local 3D editing remains available.</p>
      : loading ? <p role="status">Checking your saved session...</p>
        : user ? <div className="cloud-signed-in">
          <p>Signed in as <strong>{user.email || user.id}</strong></p>
          <button type="button" onClick={signOut} disabled={busy}>Sign out</button>
        </div> : <>
          <form onSubmit={sendMagicLink} className="cloud-auth-form">
            <label htmlFor="cloud-email">Email address</label>
            <input id="cloud-email" type="email" autoComplete="email" required value={email}
              onChange={event => setEmail(event.target.value)} placeholder="you@example.com" maxLength={254}/>
            <button type="submit" disabled={busy || !email.trim()}>{busy ? 'Sending...' : 'Send Magic Link'}</button>
          </form>
          {ENABLE_SOCIAL ? <div className="cloud-social">
            <button type="button" onClick={() => socialLogin('google')} disabled={busy}>Continue with Google</button>
            <button type="button" onClick={() => socialLogin('github')} disabled={busy}>Continue with GitHub</button>
          </div> : <p className="cloud-hint">Google / GitHub login will be enabled after email sign-in and OAuth provider checks.</p>}
        </>}
    {message && <p role="status" className="cloud-message">{message}</p>}
  </section>;
}
