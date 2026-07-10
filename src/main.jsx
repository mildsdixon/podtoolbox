import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  CreditCard,
  Database,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Mic,
  Pencil,
  Play,
  Plus,
  Podcast,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import './styles.css';

const tiers = [
  {
    name: 'Starter',
    price: '$19',
    description: 'Perfect for new podcasters.',
    icon: Podcast,
    members: '250 members',
    perks: ['Member database', 'Episode planning & notes', 'Basic analytics', 'Email support'],
  },
  {
    name: 'Studio',
    price: '$49',
    description: 'Everything you need to grow.',
    icon: Mic,
    members: '1,000 members',
    featured: true,
    perks: [
      'All Starter features',
      'Advanced member management',
      'Custom membership tiers',
      'Episode tools & publishing',
      'Payments & payout tracking',
      'Priority support',
    ],
  },
  {
    name: 'Network',
    price: '$129',
    description: 'For teams and multi-show networks.',
    icon: Sparkles,
    members: '5,000 members',
    perks: ['All Studio features', 'Multiple shows & teams', 'Advanced permissions', 'White-label options', 'API access', 'Dedicated support'],
  },
];

const fallbackMembers = [
  { id: 'demo-1', full_name: 'Jamie Park', email: 'jamie@park.com', plan: 'Studio', status: 'active', joined_on: '2026-05-10', renewal_on: '2026-08-10' },
  { id: 'demo-2', full_name: 'Riley Cooper', email: 'riley@cooper.com', plan: 'Starter', status: 'active', joined_on: '2026-05-09', renewal_on: '2026-08-09' },
  { id: 'demo-3', full_name: 'Taylor Morgan', email: 'taylor@morgan.com', plan: 'Studio', status: 'trialing', joined_on: '2026-05-06', renewal_on: '2026-08-06' },
  { id: 'demo-4', full_name: 'Casey Lee', email: 'casey@lee.com', plan: 'Network', status: 'active', joined_on: '2026-05-02', renewal_on: '2026-08-02' },
];

const fallbackEpisodes = [
  { id: 'ep-58', episode_number: 58, title: 'Building a loyal audience', status: 'published', publish_date: '2026-05-11' },
  { id: 'ep-57', episode_number: 57, title: 'Gear that actually matters', status: 'published', publish_date: '2026-05-04' },
  { id: 'ep-56', episode_number: 56, title: 'Monetization strategies', status: 'scheduled', publish_date: '2026-05-18' },
  { id: 'ep-55', episode_number: 55, title: 'Interview with Mia Lee', status: 'draft', publish_date: '2026-04-27' },
];

const fallbackPayments = [
  { id: 'pay-1', member_id: 'demo-1', amount_cents: 4900, status: 'paid', provider: 'manual', paid_at: '2026-07-01', podcast_members: fallbackMembers[0] },
  { id: 'pay-2', member_id: 'demo-3', amount_cents: 4900, status: 'paid', provider: 'manual', paid_at: '2026-07-01', podcast_members: fallbackMembers[2] },
  { id: 'pay-3', member_id: 'demo-4', amount_cents: 12900, status: 'paid', provider: 'manual', paid_at: '2026-07-01', podcast_members: fallbackMembers[3] },
];

const emptyMember = {
  full_name: '',
  email: '',
  plan: 'Starter',
  status: 'active',
  joined_on: new Date().toISOString().slice(0, 10),
  renewal_on: '',
  notes: '',
};

const emptyEpisode = {
  episode_number: '',
  title: '',
  status: 'draft',
  publish_date: '',
  description: '',
};

const emptyPayment = {
  member_id: '',
  amount_cents: 1900,
  status: 'paid',
  provider: 'manual',
};

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

function displayDate(value) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
}

function Logo({ compact = false }) {
  return (
    <a className={`logo ${compact ? 'logoCompact' : ''}`} href="#top" aria-label="PodToolbox home">
      <span className="logoMark" aria-hidden="true">
        <span className="wave waveLeft" />
        <span className="toolbox">
          <Mic size={22} strokeWidth={2.4} />
          <span className="handle" />
        </span>
        <span className="wave waveRight" />
      </span>
      {!compact && <span className="logoText">PodToolbox</span>}
    </a>
  );
}

function Header({ view, setView }) {
  return (
    <header className="siteHeader">
      <Logo />
      <nav className="mainNav" aria-label="Primary navigation">
        <button className={view === 'site' ? 'navActive' : ''} type="button" onClick={() => setView('site')}>Website</button>
        <a href="#features" onClick={() => setView('site')}>Features</a>
        <a href="#pricing" onClick={() => setView('site')}>Pricing</a>
        <button className={view === 'admin' ? 'navActive' : ''} type="button" onClick={() => setView('admin')}>Admin</button>
      </nav>
      <button className="headerSignIn" type="button" onClick={() => setView(view === 'admin' ? 'site' : 'admin')}>
        <LayoutDashboard size={20} />
        <span>{view === 'admin' ? 'Website' : 'Admin'}</span>
      </button>
    </header>
  );
}

function AuthPanel({ selectedPlan, setSelectedPlan, setView }) {
  return (
    <aside className="authStack" id="signin" aria-label="Sign in and membership status">
      <div className="signInPanel">
        <h2>Admin backend</h2>
        <p>Sign in with Supabase Auth to manage members, episodes, plans, and payments.</p>
        <button className="primaryWide" type="button" onClick={() => setView('admin')}>
          <span>Open admin</span>
          <ArrowRight size={19} />
        </button>
        <p className="panelFoot">First owner: <strong>mdixon@okanemedia.net</strong></p>
      </div>

      <div className="statusPanel" id="membership">
        <div>
          <h3>Membership status</h3>
          <p>Plan</p>
          <strong>{selectedPlan}</strong>
        </div>
        <span className="statusPill">Active</span>
        <div className="renewal">
          <span>Renewal</span>
          <strong>Aug 12, 2026</strong>
        </div>
        <div className="planSelector" aria-label="Membership plan selector">
          {tiers.map((tier) => (
            <button
              key={tier.name}
              className={selectedPlan === tier.name ? 'selected' : ''}
              type="button"
              onClick={() => setSelectedPlan(tier.name)}
            >
              {tier.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function DashboardPreview({ selectedPlan }) {
  const metrics = useMemo(
    () => [
      ['Total Members', selectedPlan === 'Network' ? '4,842' : selectedPlan === 'Studio' ? '1,248' : '186', Users],
      ['Active Members', selectedPlan === 'Network' ? '3,970' : selectedPlan === 'Studio' ? '982' : '143', Database],
      ['MRR', selectedPlan === 'Network' ? '$18,900' : selectedPlan === 'Studio' ? '$4,620' : '$740', BadgeDollarSign],
      ['Episodes', selectedPlan === 'Network' ? '216' : selectedPlan === 'Studio' ? '58' : '12', Play],
    ],
    [selectedPlan]
  );

  return (
    <section className="dashboardPreview" aria-label="PodToolbox dashboard preview">
      <aside className="previewSidebar">
        <Logo compact />
        <div className="miniBrand">PodToolbox</div>
        {[
          ['Dashboard', Database],
          ['Members', Users],
          ['Episodes', Mic],
          ['Memberships', ShieldCheck],
          ['Payments', CreditCard],
          ['Settings', Settings],
        ].map(([label, Icon], index) => (
          <button className={index === 0 ? 'active' : ''} type="button" key={label}>
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </aside>

      <div className="previewMain">
        <div className="previewHeader">
          <div>
            <h2>Dashboard</h2>
            <p>Overview of your podcast, members, and activity.</p>
          </div>
          <button type="button">
            <Users size={17} />
            Add member
          </button>
        </div>
        <div className="metricGrid">
          {metrics.map(([label, value, Icon]) => (
            <div className="metric" key={label}>
              <Icon size={24} />
              <span>{label}</span>
              <strong>{value}</strong>
              <small>+12% this month</small>
            </div>
          ))}
        </div>
        <div className="dataGrid">
          <div className="tableCard">
            <div className="tableHead">
              <h3>Recent Members</h3>
              <a href="#membership">View all</a>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {fallbackMembers.map((member) => (
                  <tr key={member.email}>
                    <td><span className="avatar">{initials(member.full_name)}</span>{member.full_name}</td>
                    <td>{member.email}</td>
                    <td><span className={`tag tag${member.plan}`}>{member.plan}</span></td>
                    <td>{displayDate(member.joined_on)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tableCard">
            <div className="tableHead">
              <h3>Recent Episodes</h3>
              <a href="#features">View all</a>
            </div>
            <div className="episodeList">
              {fallbackEpisodes.map((episode) => (
                <div className="episodeRow" key={episode.id}>
                  <button type="button" aria-label={`Play ${episode.title}`}><Play size={13} /></button>
                  <span>EP {episode.episode_number}: {episode.title}</span>
                  <strong className={`episode${episode.status[0].toUpperCase()}${episode.status.slice(1)}`}>{episode.status}</strong>
                  <time>{displayDate(episode.publish_date).replace(', 2026', '')}</time>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ selectedPlan, setSelectedPlan }) {
  return (
    <section className="pricingSection" id="pricing">
      <h2>Simple plans for creators at every stage.</h2>
      <div className="pricingGrid">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <article className={`priceCard ${tier.featured ? 'featured' : ''}`} key={tier.name}>
              {tier.featured && <span className="popular">Most popular</span>}
              <Icon size={28} />
              <h3>{tier.name}</h3>
              <p>{tier.description}</p>
              <div className="price"><strong>{tier.price}</strong><span>/month</span></div>
              <button type="button" onClick={() => setSelectedPlan(tier.name)}>
                {selectedPlan === tier.name ? 'Current plan' : `Start ${tier.name}`}
              </button>
              <ul>
                <li><Check size={16} /> Up to {tier.members}</li>
                {tier.perks.map((perk) => <li key={perk}><Check size={16} /> {perk}</li>)}
              </ul>
            </article>
          );
        })}
      </div>
      <p className="pricingFoot"><ShieldCheck size={16} /> All plans include secure payments, SSL, and creator-friendly exports.</p>
    </section>
  );
}

function WebsiteView({ setView }) {
  const [selectedPlan, setSelectedPlan] = useState('Studio');

  return (
    <>
      <section className="hero">
        <div className="heroCopy">
          <h1>PodToolbox</h1>
          <p className="lead">Organize your podcast production, membership, and monetization.</p>
          <div className="featureStrip" id="features">
            <div><Users size={30} /><strong>Member database</strong><span>Track and engage your members.</span></div>
            <div><Mic size={30} /><strong>Episode tools</strong><span>Plan, produce, and publish with ease.</span></div>
            <div><BadgeDollarSign size={30} /><strong>Monetization</strong><span>Manage plans, payments, and access.</span></div>
          </div>
          <div className="heroActions">
            <a className="startButton" href="#pricing"><Wrench size={21} /> Start membership</a>
            <button className="secondaryButton" type="button" onClick={() => setView('admin')}><ArrowRight size={21} /> Admin sign in</button>
          </div>
          <p className="trust"><ShieldCheck size={16} /> Secure. Built for creators. Trusted by podcasters.</p>
        </div>
        <AuthPanel selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} setView={setView} />
      </section>
      <DashboardPreview selectedPlan={selectedPlan} />
      <Pricing selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} />
    </>
  );
}

function AdminLogin({ session, setMessage }) {
  const [email, setEmail] = useState('mdixon@okanemedia.net');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    if (!hasSupabaseConfig) {
      setMessage('Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable live Supabase Auth.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(error ? error.message : 'Signed in.');
  }

  async function signUp() {
    if (!hasSupabaseConfig) {
      setMessage('Add Supabase env vars before creating an admin account.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    setMessage(error ? error.message : 'Account created. Confirm the email if Supabase requires confirmation, then sign in.');
  }

  if (session) return null;

  return (
    <section className="adminLogin">
      <div>
        <h1>Admin backend</h1>
        <p>Use Supabase Auth to access the PodToolbox database. The first owner email is already authorized in RLS.</p>
      </div>
      <form className="adminAuthCard" onSubmit={signIn}>
        <label>
          <span>Email</span>
          <span className="inputWrap">
            <Mail size={18} />
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </span>
        </label>
        <label>
          <span>Password</span>
          <span className="inputWrap">
            <Lock size={18} />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={6} />
          </span>
        </label>
        <button className="primaryWide" type="submit" disabled={busy}>{busy ? 'Working...' : 'Sign in'}</button>
        <button className="secondaryWide" type="button" onClick={signUp} disabled={busy}>Create admin account</button>
      </form>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="adminField">
      <span>{label}</span>
      {children}
    </label>
  );
}

function AdminBackend() {
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState(fallbackMembers);
  const [episodes, setEpisodes] = useState(fallbackEpisodes);
  const [payments, setPayments] = useState(fallbackPayments);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [episodeForm, setEpisodeForm] = useState(emptyEpisode);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingEpisodeId, setEditingEpisodeId] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const metrics = useMemo(() => {
    const activeMembers = members.filter((member) => member.status === 'active').length;
    const monthlyRevenue = payments
      .filter((payment) => payment.status === 'paid')
      .reduce((sum, payment) => sum + Number(payment.amount_cents || 0), 0);
    return [
      ['Total Members', members.length, Users],
      ['Active Members', activeMembers, Database],
      ['Recorded Revenue', money(monthlyRevenue), BadgeDollarSign],
      ['Episodes', episodes.length, Mic],
    ];
  }, [members, payments, episodes]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setMessage('Demo mode: add Supabase env vars to connect this admin panel to the live database.');
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadData();
    } else if (hasSupabaseConfig) {
      setIsAdmin(false);
    }
  }, [session]);

  async function loadData() {
    if (!hasSupabaseConfig || !session) return;

    setBusy(true);
    setMessage('');

    const adminResult = await supabase.from('podtoolbox_admins').select('id,email,role').limit(1);
    if (adminResult.error || !adminResult.data?.length) {
      setIsAdmin(false);
      setBusy(false);
      setMessage(adminResult.error?.message || 'This signed-in user is not a PodToolbox admin.');
      return;
    }

    const [memberResult, episodeResult, paymentResult] = await Promise.all([
      supabase.from('podcast_members').select('*').order('created_at', { ascending: false }),
      supabase.from('podcast_episodes').select('*').order('episode_number', { ascending: false }),
      supabase.from('membership_payments').select('*, podcast_members(full_name,email)').order('paid_at', { ascending: false }),
    ]);

    setBusy(false);
    setIsAdmin(true);

    const firstError = memberResult.error || episodeResult.error || paymentResult.error;
    if (firstError) {
      setMessage(firstError.message);
      return;
    }

    setMembers(memberResult.data || []);
    setEpisodes(episodeResult.data || []);
    setPayments(paymentResult.data || []);
    setPaymentForm((current) => ({ ...current, member_id: memberResult.data?.[0]?.id || '' }));
    setMessage('Admin database synced.');
  }

  function updateMemberForm(field, value) {
    setMemberForm((current) => ({ ...current, [field]: value }));
  }

  function updateEpisodeForm(field, value) {
    setEpisodeForm((current) => ({ ...current, [field]: value }));
  }

  async function saveMember(event) {
    event.preventDefault();
    const payload = {
      ...memberForm,
      renewal_on: memberForm.renewal_on || null,
      notes: memberForm.notes || null,
    };

    if (!hasSupabaseConfig || !session || !isAdmin) {
      const next = editingMemberId
        ? members.map((member) => (member.id === editingMemberId ? { ...member, ...payload } : member))
        : [{ ...payload, id: crypto.randomUUID() }, ...members];
      setMembers(next);
      setMemberForm(emptyMember);
      setEditingMemberId(null);
      setMessage('Demo member saved locally.');
      return;
    }

    setBusy(true);
    const result = editingMemberId
      ? await supabase.from('podcast_members').update(payload).eq('id', editingMemberId)
      : await supabase.from('podcast_members').insert(payload);
    setBusy(false);
    setMessage(result.error ? result.error.message : 'Member saved.');
    if (!result.error) {
      setMemberForm(emptyMember);
      setEditingMemberId(null);
      loadData();
    }
  }

  async function deleteMember(id) {
    if (!confirm('Delete this member?')) return;
    if (!hasSupabaseConfig || !session || !isAdmin) {
      setMembers((current) => current.filter((member) => member.id !== id));
      return;
    }
    const { error } = await supabase.from('podcast_members').delete().eq('id', id);
    setMessage(error ? error.message : 'Member deleted.');
    if (!error) loadData();
  }

  async function saveEpisode(event) {
    event.preventDefault();
    const payload = {
      ...episodeForm,
      episode_number: episodeForm.episode_number ? Number(episodeForm.episode_number) : null,
      publish_date: episodeForm.publish_date || null,
      description: episodeForm.description || null,
    };

    if (!hasSupabaseConfig || !session || !isAdmin) {
      const next = editingEpisodeId
        ? episodes.map((episode) => (episode.id === editingEpisodeId ? { ...episode, ...payload } : episode))
        : [{ ...payload, id: crypto.randomUUID() }, ...episodes];
      setEpisodes(next);
      setEpisodeForm(emptyEpisode);
      setEditingEpisodeId(null);
      setMessage('Demo episode saved locally.');
      return;
    }

    setBusy(true);
    const result = editingEpisodeId
      ? await supabase.from('podcast_episodes').update(payload).eq('id', editingEpisodeId)
      : await supabase.from('podcast_episodes').insert(payload);
    setBusy(false);
    setMessage(result.error ? result.error.message : 'Episode saved.');
    if (!result.error) {
      setEpisodeForm(emptyEpisode);
      setEditingEpisodeId(null);
      loadData();
    }
  }

  async function deleteEpisode(id) {
    if (!confirm('Delete this episode?')) return;
    if (!hasSupabaseConfig || !session || !isAdmin) {
      setEpisodes((current) => current.filter((episode) => episode.id !== id));
      return;
    }
    const { error } = await supabase.from('podcast_episodes').delete().eq('id', id);
    setMessage(error ? error.message : 'Episode deleted.');
    if (!error) loadData();
  }

  async function savePayment(event) {
    event.preventDefault();
    const payload = { ...paymentForm, amount_cents: Number(paymentForm.amount_cents) };
    if (!hasSupabaseConfig || !session || !isAdmin) {
      const member = members.find((item) => item.id === payload.member_id);
      setPayments([{ ...payload, id: crypto.randomUUID(), paid_at: new Date().toISOString(), podcast_members: member }, ...payments]);
      setMessage('Demo payment logged locally.');
      return;
    }

    const { error } = await supabase.from('membership_payments').insert(payload);
    setMessage(error ? error.message : 'Payment logged.');
    if (!error) {
      setPaymentForm(emptyPayment);
      loadData();
    }
  }

  async function signOut() {
    if (hasSupabaseConfig) await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  }

  function beginEditMember(member) {
    setEditingMemberId(member.id);
    setMemberForm({
      full_name: member.full_name,
      email: member.email,
      plan: member.plan,
      status: member.status,
      joined_on: member.joined_on || '',
      renewal_on: member.renewal_on || '',
      notes: member.notes || '',
    });
    setActiveTab('members');
  }

  function beginEditEpisode(episode) {
    setEditingEpisodeId(episode.id);
    setEpisodeForm({
      episode_number: episode.episode_number || '',
      title: episode.title,
      status: episode.status,
      publish_date: episode.publish_date || '',
      description: episode.description || '',
    });
    setActiveTab('episodes');
  }

  return (
    <section className="adminShell">
      <AdminLogin session={session} setMessage={setMessage} />

      {(session || !hasSupabaseConfig) && (
        <>
          <div className="adminTopbar">
            <div>
              <h1>Admin backend</h1>
              <p>{hasSupabaseConfig ? `Signed in as ${session?.user?.email || 'admin'}` : 'Demo mode with local sample data'}</p>
            </div>
            <div className="adminTopbarActions">
              <button type="button" onClick={loadData} disabled={busy || !session}>
                <Database size={18} />
                Sync
              </button>
              <button type="button" onClick={signOut}>
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>

          {message && <div className={`adminNotice ${isAdmin || !session ? '' : 'warning'}`}>{message}</div>}

          {(isAdmin || !hasSupabaseConfig) && (
            <>
              <div className="adminMetrics">
                {metrics.map(([label, value, Icon]) => (
                  <div className="adminMetric" key={label}>
                    <Icon size={24} />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="adminTabs" role="tablist" aria-label="Admin sections">
                {['members', 'episodes', 'payments'].map((tab) => (
                  <button className={activeTab === tab ? 'active' : ''} type="button" key={tab} onClick={() => setActiveTab(tab)}>
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'members' && (
                <div className="adminGrid">
                  <form className="adminForm" onSubmit={saveMember}>
                    <h2>{editingMemberId ? 'Edit member' : 'Add member'}</h2>
                    <Field label="Full name"><input value={memberForm.full_name} onChange={(event) => updateMemberForm('full_name', event.target.value)} required /></Field>
                    <Field label="Email"><input value={memberForm.email} onChange={(event) => updateMemberForm('email', event.target.value)} type="email" required /></Field>
                    <div className="twoFields">
                      <Field label="Plan">
                        <select value={memberForm.plan} onChange={(event) => updateMemberForm('plan', event.target.value)}>
                          <option>Starter</option>
                          <option>Studio</option>
                          <option>Network</option>
                        </select>
                      </Field>
                      <Field label="Status">
                        <select value={memberForm.status} onChange={(event) => updateMemberForm('status', event.target.value)}>
                          <option value="active">active</option>
                          <option value="trialing">trialing</option>
                          <option value="past_due">past_due</option>
                          <option value="canceled">canceled</option>
                        </select>
                      </Field>
                    </div>
                    <div className="twoFields">
                      <Field label="Joined"><input value={memberForm.joined_on} onChange={(event) => updateMemberForm('joined_on', event.target.value)} type="date" required /></Field>
                      <Field label="Renewal"><input value={memberForm.renewal_on} onChange={(event) => updateMemberForm('renewal_on', event.target.value)} type="date" /></Field>
                    </div>
                    <Field label="Notes"><textarea value={memberForm.notes} onChange={(event) => updateMemberForm('notes', event.target.value)} rows="4" /></Field>
                    <button className="adminPrimary" type="submit" disabled={busy}><Save size={18} /> Save member</button>
                  </form>

                  <div className="adminTableCard">
                    <h2>Members database</h2>
                    <table>
                      <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Status</th><th>Renewal</th><th>Actions</th></tr></thead>
                      <tbody>
                        {members.map((member) => (
                          <tr key={member.id}>
                            <td><span className="avatar">{initials(member.full_name)}</span>{member.full_name}</td>
                            <td>{member.email}</td>
                            <td><span className={`tag tag${member.plan}`}>{member.plan}</span></td>
                            <td>{member.status}</td>
                            <td>{displayDate(member.renewal_on)}</td>
                            <td className="rowActions">
                              <button type="button" onClick={() => beginEditMember(member)} aria-label={`Edit ${member.full_name}`}><Pencil size={16} /></button>
                              <button type="button" onClick={() => deleteMember(member.id)} aria-label={`Delete ${member.full_name}`}><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'episodes' && (
                <div className="adminGrid">
                  <form className="adminForm" onSubmit={saveEpisode}>
                    <h2>{editingEpisodeId ? 'Edit episode' : 'Add episode'}</h2>
                    <Field label="Episode number"><input value={episodeForm.episode_number} onChange={(event) => updateEpisodeForm('episode_number', event.target.value)} type="number" /></Field>
                    <Field label="Title"><input value={episodeForm.title} onChange={(event) => updateEpisodeForm('title', event.target.value)} required /></Field>
                    <div className="twoFields">
                      <Field label="Status">
                        <select value={episodeForm.status} onChange={(event) => updateEpisodeForm('status', event.target.value)}>
                          <option value="draft">draft</option>
                          <option value="scheduled">scheduled</option>
                          <option value="published">published</option>
                        </select>
                      </Field>
                      <Field label="Publish date"><input value={episodeForm.publish_date} onChange={(event) => updateEpisodeForm('publish_date', event.target.value)} type="date" /></Field>
                    </div>
                    <Field label="Description"><textarea value={episodeForm.description} onChange={(event) => updateEpisodeForm('description', event.target.value)} rows="4" /></Field>
                    <button className="adminPrimary" type="submit" disabled={busy}><Save size={18} /> Save episode</button>
                  </form>

                  <div className="adminTableCard">
                    <h2>Episode tools</h2>
                    <table>
                      <thead><tr><th>Episode</th><th>Title</th><th>Status</th><th>Publish date</th><th>Actions</th></tr></thead>
                      <tbody>
                        {episodes.map((episode) => (
                          <tr key={episode.id}>
                            <td>{episode.episode_number ? `EP ${episode.episode_number}` : 'No number'}</td>
                            <td>{episode.title}</td>
                            <td>{episode.status}</td>
                            <td>{displayDate(episode.publish_date)}</td>
                            <td className="rowActions">
                              <button type="button" onClick={() => beginEditEpisode(episode)} aria-label={`Edit ${episode.title}`}><Pencil size={16} /></button>
                              <button type="button" onClick={() => deleteEpisode(episode.id)} aria-label={`Delete ${episode.title}`}><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="adminGrid">
                  <form className="adminForm" onSubmit={savePayment}>
                    <h2>Log payment</h2>
                    <Field label="Member">
                      <select value={paymentForm.member_id} onChange={(event) => setPaymentForm((current) => ({ ...current, member_id: event.target.value }))} required>
                        <option value="">Select member</option>
                        {members.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
                      </select>
                    </Field>
                    <div className="twoFields">
                      <Field label="Amount cents"><input value={paymentForm.amount_cents} onChange={(event) => setPaymentForm((current) => ({ ...current, amount_cents: event.target.value }))} type="number" min="0" required /></Field>
                      <Field label="Status">
                        <select value={paymentForm.status} onChange={(event) => setPaymentForm((current) => ({ ...current, status: event.target.value }))}>
                          <option value="paid">paid</option>
                          <option value="pending">pending</option>
                          <option value="failed">failed</option>
                          <option value="refunded">refunded</option>
                        </select>
                      </Field>
                    </div>
                    <Field label="Provider"><input value={paymentForm.provider} onChange={(event) => setPaymentForm((current) => ({ ...current, provider: event.target.value }))} /></Field>
                    <button className="adminPrimary" type="submit" disabled={busy}><Plus size={18} /> Log payment</button>
                  </form>

                  <div className="adminTableCard">
                    <h2>Payments</h2>
                    <table>
                      <thead><tr><th>Member</th><th>Email</th><th>Amount</th><th>Status</th><th>Provider</th><th>Paid</th></tr></thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{payment.podcast_members?.full_name || 'No member'}</td>
                            <td>{payment.podcast_members?.email || ''}</td>
                            <td>{money(payment.amount_cents)}</td>
                            <td>{payment.status}</td>
                            <td>{payment.provider}</td>
                            <td>{displayDate(payment.paid_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function App() {
  const [view, setView] = useState('site');

  return (
    <main id="top">
      <Header view={view} setView={setView} />
      {view === 'admin' ? <AdminBackend /> : <WebsiteView setView={setView} />}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
