import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  CreditCard,
  Database,
  Lock,
  Mail,
  Mic,
  Play,
  Podcast,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
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

const members = [
  { initials: 'JP', name: 'Jamie Park', email: 'jamie@park.com', plan: 'Studio', joined: 'May 10, 2026' },
  { initials: 'RC', name: 'Riley Cooper', email: 'riley@cooper.com', plan: 'Starter', joined: 'May 9, 2026' },
  { initials: 'TM', name: 'Taylor Morgan', email: 'taylor@morgan.com', plan: 'Studio', joined: 'May 6, 2026' },
  { initials: 'CL', name: 'Casey Lee', email: 'casey@lee.com', plan: 'Network', joined: 'May 2, 2026' },
];

const episodes = [
  ['EP 58: Building a loyal audience', 'Published', 'May 11'],
  ['EP 57: Gear that actually matters', 'Published', 'May 4'],
  ['EP 56: Monetization strategies', 'Scheduled', 'May 18'],
  ['EP 55: Interview with Mia Lee', 'Draft', 'Apr 27'],
];

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

function Header() {
  return (
    <header className="siteHeader">
      <Logo />
      <nav className="mainNav" aria-label="Primary navigation">
        <a href="#features">Features</a>
        <a href="#membership">Membership</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <a className="headerSignIn" href="#signin">
        <ArrowRight size={20} />
        <span>Sign in</span>
      </a>
    </header>
  );
}

function AuthPanel({ selectedPlan, setSelectedPlan }) {
  const [email, setEmail] = useState('you@podcast.com');
  const [password, setPassword] = useState('podtoolbox');
  const [signedIn, setSignedIn] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSignedIn(true);
  }

  return (
    <aside className="authStack" id="signin" aria-label="Sign in and membership status">
      <form className="signInPanel" onSubmit={handleSubmit}>
        <h2>{signedIn ? 'Welcome back' : 'Sign in'}</h2>
        <p>{signedIn ? `${email} is connected to your PodToolbox account.` : 'Sign in to your PodToolbox account.'}</p>
        <label>
          <span>Email</span>
          <span className="inputWrap">
            <Mail size={18} />
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </span>
        </label>
        <label>
          <span>Password</span>
          <span className="inputWrap">
            <Lock size={18} />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </span>
        </label>
        <div className="formRow">
          <label className="checkLabel">
            <input type="checkbox" />
            <span>Remember me</span>
          </label>
          <button type="button" className="textButton">Forgot password?</button>
        </div>
        <button className="primaryWide" type="submit">
          <span>{signedIn ? 'Signed in' : 'Sign in'}</span>
          <ArrowRight size={19} />
        </button>
        <p className="panelFoot">Don’t have an account? <a href="#pricing">Start membership</a></p>
      </form>

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
                {members.map((member) => (
                  <tr key={member.email}>
                    <td><span className="avatar">{member.initials}</span>{member.name}</td>
                    <td>{member.email}</td>
                    <td><span className={`tag tag${member.plan}`}>{member.plan}</span></td>
                    <td>{member.joined}</td>
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
              {episodes.map(([title, status, date]) => (
                <div className="episodeRow" key={title}>
                  <button type="button" aria-label={`Play ${title}`}><Play size={13} /></button>
                  <span>{title}</span>
                  <strong className={`episode${status}`}>{status}</strong>
                  <time>{date}</time>
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

function App() {
  const [selectedPlan, setSelectedPlan] = useState('Studio');

  return (
    <main id="top">
      <Header />
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
            <a className="secondaryButton" href="#signin"><ArrowRight size={21} /> Sign in</a>
          </div>
          <p className="trust"><ShieldCheck size={16} /> Secure. Built for creators. Trusted by podcasters.</p>
        </div>
        <AuthPanel selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} />
      </section>
      <DashboardPreview selectedPlan={selectedPlan} />
      <Pricing selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
