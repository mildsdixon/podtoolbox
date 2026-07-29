import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Database,
  DoorOpen,
  Download,
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
  Upload,
  Users,
  Wrench,
  Film,
  FileAudio,
  FileVideo,
  ImagePlus,
  Palette,
  RefreshCw,
  Send,
} from 'lucide-react';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import { analyzeTranscript } from './clipAnalyzer.js';
import { addContact, createCampaign, sendCampaign, unsubscribeContact } from './piContact.js';
import { createPodReel, samplePodReels, validateReelDuration } from './podReels.js';
import { availablePodVerterFormats, formatPodVerterBytes } from './podVerter.js';
import {
  SOCIAL_PLATFORMS,
  createScheduledPost,
  defaultSocialSchedule,
  formatScheduledPostTime,
} from './publishingPlanner.js';
import podToolboxLogo from '../assets/pod-toolbox-logo-tools-web.png';
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

const fallbackPiContacts = [
  { id: 'pc-1', fullName: 'Avery Producer', email: 'avery@example.com', status: 'subscribed', source: 'landing page', tags: ['newsletter', 'creator'], optedInAt: '2026-07-01T12:00:00.000Z' },
  { id: 'pc-2', fullName: 'Morgan Listener', email: 'morgan@example.com', status: 'subscribed', source: 'manual import', tags: ['listener'], optedInAt: '2026-07-03T12:00:00.000Z' },
  { id: 'pc-3', fullName: 'Jordan Opted Out', email: 'jordan@example.com', status: 'unsubscribed', source: 'old list', tags: [], optedInAt: '2026-06-20T12:00:00.000Z' },
];

const emptyPiContact = {
  fullName: '',
  email: '',
  tags: '',
  source: 'manual',
  consent: true,
};

const emptyPiCampaign = {
  subject: 'New podcast update',
  previewText: 'A quick update from the network',
  body: 'Hey — here is what is new this week. Tap in, listen, and share with somebody who needs it.',
};

const emptyPodReel = {
  title: 'Why this podcast moment matters',
  hook: 'This is the moment that makes people stop scrolling.',
  sourceEpisode: 'Episode 1',
  durationSeconds: 24,
  caption: 'This podcast moment is built for Reels, Shorts, TikTok, and Facebook.',
  platforms: ['Instagram Reels', 'YouTube Shorts', 'TikTok', 'Facebook Reels'],
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
      <img className="logoImage" src={podToolboxLogo} alt="" />
    </a>
  );
}

function Header({ view, openWebsite, openAdmin, openPodClipz, openGame, openPiContact, openPodReels, openPodVerter }) {
  const toolsActive = ['clipz', 'reels', 'contacts', 'podverter'].includes(view);

  function closeToolsMenu(event) {
    event.currentTarget.closest('details')?.removeAttribute('open');
  }

  return (
    <header className="siteHeader">
      <Logo />
      <nav className="mainNav" aria-label="Primary navigation">
        <button className={view === 'site' ? 'navActive' : ''} type="button" onClick={openWebsite}>Website</button>
        <a href="#features" onClick={openWebsite}>Features</a>
        <details className="toolsMenu">
          <summary className={toolsActive ? 'navActive' : ''}>
            <Wrench size={17} />
            <span>Tools</span>
            <ChevronDown size={16} className="toolsChevron" />
          </summary>
          <div className="toolsMenuPanel">
            <button className={view === 'clipz' ? 'navActive' : ''} type="button" onClick={(event) => { closeToolsMenu(event); openPodClipz(); }}>PodClipz</button>
            <button className={view === 'podverter' ? 'navActive' : ''} type="button" onClick={(event) => { closeToolsMenu(event); openPodVerter(); }}>PODVerter</button>
            <button className={view === 'reels' ? 'navActive' : ''} type="button" onClick={(event) => { closeToolsMenu(event); openPodReels(); }}>RodReelz</button>
            <button className={view === 'contacts' ? 'navActive' : ''} type="button" onClick={(event) => { closeToolsMenu(event); openPiContact(); }}>Podtacts</button>
          </div>
        </details>
        <button className={view === 'game' ? 'navActive' : ''} type="button" onClick={openGame}>Game</button>
        <a href="#pricing" onClick={openWebsite}>Pricing</a>
        <button className={view === 'admin' ? 'navActive' : ''} type="button" onClick={() => openAdmin()}>Admin</button>
      </nav>
      <a className="headerSignIn" href="#membership">
        <ArrowRight size={20} />
        <span>Membership</span>
      </a>
    </header>
  );
}

function AuthPanel({ selectedPlan, setSelectedPlan }) {
  return (
    <aside className="authStack" id="signin" aria-label="Sign in and membership status">
      <div className="signInPanel">
        <h2>Member access</h2>
        <p>Membership tools are connected to a secure Supabase database behind the scenes.</p>
        <a className="primaryWide" href="#pricing">
          <span>Start membership</span>
          <ArrowRight size={19} />
        </a>
        <p className="panelFoot">Manage plan, renewal, and access in one place.</p>
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

function DashboardPreview({ selectedPlan, openAdmin }) {
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
          ['Dashboard', Database, 'members'],
          ['Members', Users, 'members'],
          ['Episodes', Mic, 'episodes'],
          ['Tools', Wrench, 'clips'],
          ['RodReelz', Film, 'reels'],
          ['Podtacts', Mail, 'contacts'],
          ['Games', Play, 'games'],
          ['Portal', DoorOpen, 'portal'],
          ['Memberships', ShieldCheck, 'members'],
          ['Payments', CreditCard, 'payments'],
          ['Settings', Settings, 'settings'],
        ].map(([label, Icon, adminTab], index) => (
          <button className={index === 0 ? 'active' : ''} type="button" key={label} onClick={() => openAdmin(adminTab)}>
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
          <button type="button" onClick={() => openAdmin('members')}>
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
                  <button type="button" aria-label={`Manage ${episode.title}`} onClick={() => openAdmin('episodes')}><Pencil size={13} /></button>
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

function PodClipzFeature({ openPodClipz }) {
  const demoResult = analyzeTranscript(sampleClipTranscript, { limit: 2 });
  const topClip = demoResult.candidates[0];

  return (
    <section className="podclipzSection" id="podclipz" aria-label="PodClipz clip analyzer">
      <div className="podclipzCopy">
        <span className="sectionEyebrow"><Sparkles size={16} /> New skill inside PodToolbox</span>
        <h2>PodClipz finds the moments worth posting.</h2>
        <p>
          Paste a podcast transcript and PodClipz ranks the strongest short-form moments with Opus-style scoring,
          platform recommendations, captions, and edit notes.
        </p>
        <div className="podclipzPills" aria-label="PodClipz scoring signals">
          {['Hook score', 'Platform fit', 'Caption idea', 'Edit notes'].map((item) => <span key={item}>{item}</span>)}
        </div>
        <button className="startButton" type="button" onClick={openPodClipz}>
          <Sparkles size={20} /> Try PodClipz in Admin
        </button>
      </div>

      <div className="podclipzDemoCard">
        <div className="demoCardHeader">
          <span>Top clip candidate</span>
          <strong>{topClip?.score || 0}%</strong>
        </div>
        <h3>{topClip?.headline}</h3>
        <p>{topClip?.text}</p>
        <div className="platformChips">
          {topClip?.platforms.slice(0, 4).map((platform) => (
            <span key={platform.name}><b>{platform.name}</b> {platform.fit}%</span>
          ))}
        </div>
        <div className="demoCaptionBox">
          <strong>Suggested caption</strong>
          <p>{topClip?.caption}</p>
        </div>
      </div>
    </section>
  );
}

const gameDecks = {
  blackHistory: {
    label: 'Black History',
    prompts: [
      'Which Black historical figure should more people know by name, and why?',
      'What moment in Black history changed how you understand America?',
      'What Black history lesson do you wish schools taught with more honesty?',
      'Which Black artist, activist, athlete, or leader shaped your worldview?',
      'How should families keep Black history alive outside of February?',
      'Which Black history topic would make a powerful podcast episode?',
    ],
  },
  sports: {
    label: 'Sports',
    prompts: [
      'What sports debate can make you argue like a commentator?',
      'Which athlete changed the culture beyond the scoreboard?',
      'Should athletes be expected to speak on social issues?',
      'What makes someone a true fan instead of a casual viewer?',
      'How much should championships matter in ranking greatness?',
      'What lesson from sports applies to relationships, business, or life?',
    ],
  },
  sex: {
    label: 'Sex',
    prompts: [
      'What makes conversations about intimacy feel safe instead of awkward?',
      'How important is emotional chemistry compared with physical chemistry?',
      'What is one boundary every healthy relationship should respect?',
      'How can partners talk about desire without pressure or judgment?',
      'Why is consent more than just asking one question?',
      'How do trust and communication change physical intimacy?',
    ],
  },
  childhood: {
    label: 'Childhood',
    prompts: [
      'What childhood rule made no sense then but makes sense now?',
      'Which snack, show, song, or toy instantly takes you back?',
      'Who was the adult that made you feel seen as a kid?',
      'What game did you play outside until the streetlights came on?',
      'How did your neighborhood shape who you became?',
      'What advice would you give your younger self?',
    ],
  },
};

const diceMap = {
  1: 'blackHistory',
  2: 'sports',
  3: 'sex',
  4: 'childhood',
};

function formatGameTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function PodcastGameView({ compact = false }) {
  const categoryKeys = Object.keys(gameDecks);
  const [dice, setDice] = useState(null);
  const [activeCategory, setActiveCategory] = useState('blackHistory');
  const [card, setCard] = useState(gameDecks.blackHistory.prompts[0]);
  const [round, setRound] = useState(1);
  const [drawn, setDrawn] = useState(0);
  const [seconds, setSeconds] = useState(180);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('Roll the dice to choose a topic deck.');

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  function chooseRandomCategory() {
    return categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
  }

  function rollDice() {
    const value = Math.floor(Math.random() * 6) + 1;
    const nextCategory = diceMap[value] || chooseRandomCategory();
    setDice(value);
    setActiveCategory(nextCategory);
    setStatus(value === 5 ? `Rolled 5: wild draw from ${gameDecks[nextCategory].label}.` : value === 6 ? `Rolled 6: table choice. ${gameDecks[nextCategory].label} is ready, or pick another deck.` : `Rolled ${value}: ${gameDecks[nextCategory].label}.`);
  }

  function drawCard(category = activeCategory) {
    const prompts = gameDecks[category].prompts;
    const nextCard = prompts[Math.floor(Math.random() * prompts.length)];
    setActiveCategory(category);
    setCard(nextCard);
    setDrawn((count) => count + 1);
    setStatus('Start the 3:00 timer and discuss the card.');
  }

  function resetRound() {
    setRunning(false);
    setSeconds(180);
    setRound((current) => current + 1);
    setStatus('Round reset. Roll again for a new topic.');
  }

  return (
    <section className={compact ? 'gameSection gameSectionCompact' : 'gameSection'} id="podcast-game" aria-label="Podcast topic card game">
      <div className="gameIntro">
        <span className="sectionEyebrow"><Play size={16} /> Podcast Game</span>
        <h1>{compact ? 'Podcast topic game' : 'Play the podcast topic card game online.'}</h1>
        <p>Roll the dice, pull a card from Black History, Sports, Sex, or Childhood, then talk it out on a 3:00 timer.</p>
        <div className="gameStats">
          <span><b>Round</b>{round}</span>
          <span><b>Cards drawn</b>{drawn}</span>
          <span><b>Timer</b>{formatGameTimer(seconds)}</span>
        </div>
      </div>

      <div className="gameBoard">
        <div className="dicePanel">
          <div className="dieFace" aria-label="Current dice roll">{dice || '—'}</div>
          <div>
            <strong>{status}</strong>
            <p>1 Black History · 2 Sports · 3 Sex · 4 Childhood · 5 Wild · 6 Table choice</p>
          </div>
          <button className="adminPrimary" type="button" onClick={rollDice}>Roll dice</button>
        </div>

        <div className="topicDeckGrid">
          {categoryKeys.map((key) => (
            <button className={activeCategory === key ? 'topicDeck active' : 'topicDeck'} key={key} type="button" onClick={() => drawCard(key)}>
              <span>{gameDecks[key].label}</span>
              <small>{gameDecks[key].prompts.length} cards</small>
            </button>
          ))}
        </div>

        <article className="promptCard">
          <span>{gameDecks[activeCategory].label}</span>
          <h2>{card}</h2>
          <div className="gameActions">
            <button className="startButton" type="button" onClick={() => drawCard()}>Draw card</button>
            <button className="secondaryWide" type="button" onClick={() => setRunning((value) => !value)}>{running ? 'Pause timer' : 'Start 3:00 timer'}</button>
            <button className="secondaryWide" type="button" onClick={resetRound}>Reset round</button>
          </div>
        </article>

        <div className="videoRoomMini" aria-label="Four-person online podcast room preview">
          {['Host / Dealer', 'Guest 1', 'Guest 2', 'Guest 3'].map((seat) => (
            <div className="videoSeat" key={seat}><Users size={20} /><span>{seat}</span></div>
          ))}
        </div>
        <p className="gameFootnote">The four-seat room is a front-end preview. Real online guest video still needs a future WebRTC room/server.</p>
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

function WebsiteView({ openPodClipz, openGame, openPiContact, openPodReels, openAdmin }) {
  const [selectedPlan, setSelectedPlan] = useState('Studio');

  return (
    <>
      <section className="hero">
        <div className="heroCopy">
          <h1 className="heroLogoHeading">
            <img src={podToolboxLogo} alt="Pod Toolbox" />
          </h1>
          <p className="lead">Organize your podcast production, membership, and monetization.</p>
          <div className="featureStrip" id="features">
            <div><Users size={30} /><strong>Member database</strong><span>Track and engage your members.</span></div>
            <div><Mic size={30} /><strong>Episode tools</strong><span>Plan, produce, and publish with ease.</span></div>
            <div><Sparkles size={30} /><strong>PodClipz</strong><span>Find the moments worth posting.</span></div>
            <div><Film size={30} /><strong>RodReelz</strong><span>Plan 15-30 second shorts.</span></div>
            <div><Mail size={30} /><strong>Podtacts</strong><span>Email opt-in contacts.</span></div>
            <div><Play size={30} /><strong>Podcast Game</strong><span>Roll topics and play online.</span></div>
            <div><BadgeDollarSign size={30} /><strong>Monetization</strong><span>Manage plans, payments, and access.</span></div>
          </div>
          <div className="heroActions">
            <button className="startButton" type="button" onClick={openPodReels}><Film size={21} /> Open RodReelz</button>
            <button className="secondaryButton" type="button" onClick={openPiContact}><Mail size={21} /> Podtacts</button>
          </div>
          <p className="trust"><ShieldCheck size={16} /> Secure. Built for creators. Trusted by podcasters.</p>
        </div>
        <AuthPanel selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} />
      </section>
      <DashboardPreview selectedPlan={selectedPlan} openAdmin={openAdmin} />
      <PodReelsTool standalone />
      <PiContactTool standalone />
      <PodcastGameView compact />
      <PodClipzFeature openPodClipz={openPodClipz} />
      <Pricing selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} />
    </>
  );
}

function AdminLogin({ session, message, setMessage, enableLocalDemo }) {
  const [email, setEmail] = useState('mdixon@okanemedia.net');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      setMessage('Enter a valid email and a password with at least 6 characters.');
      return;
    }
    if (!hasSupabaseConfig) {
      setMessage('Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable live Supabase Auth.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(error ? `${error.message}. If this is a new account, check your email confirmation link first.` : 'Signed in.');
  }

  async function signUp() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 6) {
      setMessage('Enter a valid email and a password with at least 6 characters before creating an account.');
      return;
    }
    if (!hasSupabaseConfig) {
      setMessage('Add Supabase env vars before creating an admin account.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    setMessage(error ? error.message : `Account setup started for ${email}. Check that inbox for the Supabase confirmation email, then come back and sign in.`);
  }

  async function resendConfirmation() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMessage('Enter a valid email before resending a confirmation message.');
      return;
    }
    if (!hasSupabaseConfig) {
      setMessage('Add Supabase env vars before resending confirmation email.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    setMessage(error ? error.message : `Confirmation email resent to ${email}. Check inbox, spam, promotions, and updates folders.`);
  }

  if (session) return null;

  return (
    <section className="adminLogin">
      <div>
        <h1>Admin backend</h1>
        <p>Use Supabase Auth to access the PodToolbox database. The first owner email is already authorized in RLS.</p>
      </div>
      <form className="adminAuthCard" onSubmit={signIn}>
        {message && <div className="adminNotice loginNotice">{message}</div>}
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
        <p className="authHint">Use at least 6 characters. If you just created the account, confirm the email before signing in.</p>
        <button className="primaryWide" type="submit" disabled={busy}>{busy ? 'Working...' : 'Sign in'}</button>
        <button className="secondaryWide" type="button" onClick={signUp} disabled={busy}>Create admin account</button>
        <button className="secondaryWide" type="button" onClick={resendConfirmation} disabled={busy}>Resend confirmation email</button>
        <button className="secondaryWide" type="button" onClick={enableLocalDemo} disabled={busy}>Open local demo admin</button>
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

const sampleClipTranscript = `00:00 Welcome back to the show, today we are warming up and setting context.
00:18 Most podcasters fail because they spend ninety percent of their time recording and only ten percent distributing.
00:39 The surprising truth is one great clip can sell the whole episode when the hook is clear.
01:02 Here are three steps: lead with the strongest opinion, give context fast, and end with a question people want to answer.
01:29 Anyway, let's move into housekeeping and sponsor notes.
01:55 I remember when nobody believed the show could grow, but consistency changed everything.
02:18 If you are stuck, cut the moment where your guest says the uncomfortable truth out loud.
02:42 That is the clip people share because it feels useful, emotional, and a little controversial.`;

function analyzeTopFiveClips(value) {
  return analyzeTranscript(value, { limit: 5 });
}

function parseYoutubeUrl(value) {
  const rawUrl = value.trim();
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const isYoutube = host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
    if (!isYoutube) return { error: 'Paste a YouTube link like youtube.com/watch?v=... or youtu.be/...' };

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const videoId = host === 'youtu.be'
      ? pathParts[0]
      : parsed.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(pathParts[0]) ? pathParts[1] : '');

    if (!videoId) return { error: 'That YouTube link is missing a video ID.' };
    return { url: parsed.toString(), videoId };
  } catch {
    return { error: 'Paste a full YouTube URL or a YouTube URL without https.' };
  }
}

function buildDemoTranscriptFromUrl(url, videoId) {
  return `00:00 Source URL queued: ${url}
00:10 The first thing people need to know is why this video matters before they scroll away.
00:27 Most creators miss the clip because they look for the funniest part instead of the clearest promise.
00:49 The surprising truth is the best short usually teaches one thing, creates tension, and gives people a reason to comment.
01:13 Here are three steps: open with the boldest sentence, cut every slow setup line, and end on a question.
01:42 If this YouTube video has public captions, the live transcript service can replace this demo text for video ${videoId}.
02:03 That is the kind of moment that can work on TikTok, Instagram Reels, YouTube Shorts, and Facebook because it feels useful and easy to share.
02:25 A strong personal story gives the audience a character, a struggle, and a payoff they can remember.
02:48 The mistake is explaining every detail before the listener understands why the story matters.
03:10 Start with the decision that changed everything, then reveal the pressure that made the decision difficult.
03:34 A practical clip should give one action people can try today instead of a long list they will forget.
03:57 The easiest framework is problem, surprising insight, and one clear next step.
04:19 Controversy works best when the speaker has evidence and explains the tradeoff instead of chasing outrage.
04:43 Ask a specific question at the end so viewers know exactly what to debate in the comments.
05:07 The final clip should leave people curious enough to watch the full conversation without hiding the useful part.`;
}

function buildDemoTranscriptFromMedia(fileName) {
  return `00:00 Uploaded media queued: ${fileName}
00:12 The best short clips usually start when the speaker says the idea in one clear sentence.
00:31 Most creators miss the strongest moment because they keep the long setup instead of opening with the payoff.
00:54 The surprising truth is that a clip performs when it gives people a reason to stop, save, share, or comment.
01:18 Here are three steps: find the strongest claim, cut the context down, and end before the energy drops.
01:45 This is the moment worth posting because it teaches one idea and feels easy to understand without the full episode.`;
}

async function getFunctionErrorMessage(error, data) {
  const friendlyMessage = (message) => {
    if (!message) return '';
    if (/status 429|blocked the transcript fetch|too many requests/i.test(message)) {
      return 'YouTube blocked the URL transcript fetch. Use Upload media for the reliable Opus-style transcription path.';
    }
    if (/quota|billing/i.test(message)) {
      return 'OpenAI API billing or quota needs attention before live media transcription can run.';
    }
    return message;
  };

  if (data?.error) return friendlyMessage(data.error);
  if (error?.context?.json) {
    try {
      const payload = await error.context.json();
      if (payload?.error) return friendlyMessage(payload.error);
    } catch {
      return friendlyMessage(error.message);
    }
  }
  return friendlyMessage(error?.message) || 'Live YouTube captions are not available yet.';
}

function mediaApiUrl(path) {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return `${isLocal ? 'http://127.0.0.1:8788' : ''}${path}`;
}

const podVerterMediaExtensions = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'mp4', 'mov', 'm4v', 'webm', 'mkv'];

function isPodVerterMediaFile(file) {
  const mimeType = String(file?.type || '');
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
  return /^(audio|video)\//.test(mimeType) || podVerterMediaExtensions.includes(extension);
}

function ClipAnalyzerTool({ transcript, setTranscript, result, setResult }) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [urlNotice, setUrlNotice] = useState('');
  const [mediaNotice, setMediaNotice] = useState('');
  const [acceptedYoutubeUrl, setAcceptedYoutubeUrl] = useState('');
  const [acceptedMediaName, setAcceptedMediaName] = useState('');
  const [sourceVideoFile, setSourceVideoFile] = useState(null);
  const [transcriptSource, setTranscriptSource] = useState('Sample transcript');
  const [urlBusy, setUrlBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [exportingClipId, setExportingClipId] = useState('');
  const [clipExports, setClipExports] = useState({});
  const [exportNotice, setExportNotice] = useState('');
  const [copiedClipId, setCopiedClipId] = useState('');
  const [brandKit, setBrandKit] = useState({
    name: 'Pod Toolbox',
    handle: '@podtoolbox',
    primaryColor: '#007b75',
    accentColor: '#ff624f',
  });
  const [brandLogo, setBrandLogo] = useState({ name: '', url: '' });
  const [scheduleClipId, setScheduleClipId] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState(() => defaultSocialSchedule());
  const [schedulePlatforms, setSchedulePlatforms] = useState(() => [...SOCIAL_PLATFORMS]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [scheduleNotice, setScheduleNotice] = useState('Choose a top-five clip, date, time, and social platforms.');

  const selectedScheduleClip = result?.candidates.find((clip) => clip.id === scheduleClipId)
    || result?.candidates[0]
    || null;

  useEffect(() => () => {
    if (brandLogo.url) URL.revokeObjectURL(brandLogo.url);
  }, [brandLogo.url]);

  function runAnalysis(event) {
    event.preventDefault();
    setTranscriptSource(transcriptSource || 'Manual transcript');
    setResult(analyzeTopFiveClips(transcript));
  }

  async function useYoutubeUrl(event) {
    event.preventDefault();
    const parsed = parseYoutubeUrl(youtubeUrl);

    if (parsed.error) {
      setAcceptedYoutubeUrl('');
      setUrlNotice(parsed.error);
      return;
    }

    setUrlBusy(true);
    setYoutubeUrl(parsed.url);
    setAcceptedYoutubeUrl('');
    setSourceVideoFile(null);
    setClipExports({});
    setExportNotice('');

    try {
      let nextTranscript = '';
      let nextSource = 'Demo transcript';
      let nextNotice = '';

      if (hasSupabaseConfig) {
        const { data, error } = await supabase.functions.invoke('youtube-transcript', {
          body: { url: parsed.url, videoId: parsed.videoId },
        });

        if (!error && data?.transcript) {
          nextTranscript = data.transcript;
          nextSource = data.source || 'YouTube captions';
          nextNotice = 'Transcript created from YouTube captions. PodClipz ranked the strongest short-form moments below.';
          setAcceptedYoutubeUrl(parsed.url);
        } else {
          nextTranscript = buildDemoTranscriptFromUrl(parsed.url, parsed.videoId);
          const errorMessage = await getFunctionErrorMessage(error, data);
          nextNotice = `${errorMessage} Loaded a demo transcript so you can test the ranking flow.`;
          setAcceptedYoutubeUrl('');
        }
      } else {
        nextTranscript = buildDemoTranscriptFromUrl(parsed.url, parsed.videoId);
        nextNotice = 'Demo mode: automatic YouTube transcript creation needs the Supabase youtube-transcript function. PodClipz loaded a demo transcript so you can see the scoring.';
        setAcceptedYoutubeUrl('');
      }

      setTranscript(nextTranscript);
      setTranscriptSource(nextSource);
      setResult(analyzeTopFiveClips(nextTranscript));
      setUrlNotice(nextNotice);
    } catch (error) {
      const nextTranscript = buildDemoTranscriptFromUrl(parsed.url, parsed.videoId);
      setTranscript(nextTranscript);
      setTranscriptSource('Demo transcript');
      setResult(analyzeTopFiveClips(nextTranscript));
      setAcceptedYoutubeUrl('');
      setUrlNotice(`${error.message || 'Could not reach the transcript service.'} Loaded a demo transcript so the clip analyzer still runs.`);
    } finally {
      setUrlBusy(false);
    }
  }

  async function transcribeMedia(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowedTypes = /^(audio|video)\//;
    if (!allowedTypes.test(file.type)) {
      setMediaNotice('Choose an audio or video file, such as MP3, WAV, M4A, MP4, MOV, or WEBM.');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setAcceptedMediaName(file.name);
      setAcceptedYoutubeUrl('');
      setSourceVideoFile(isVideo ? file : null);
      setClipExports({});
      setExportNotice(isVideo ? 'Video loaded for clip export. Add or paste a transcript below, then run Analyze clips and export the best moments.' : '');
      setMediaNotice('This file is over the 25 MB transcription limit, so PodClipz skipped automatic transcription. Video export is still ready for selected clips.');
      return;
    }

    setMediaBusy(true);
    setAcceptedMediaName(file.name);
    setAcceptedYoutubeUrl('');
    setSourceVideoFile(isVideo ? file : null);
    setClipExports({});
    setExportNotice(isVideo ? 'Video loaded. After analysis, use Export vertical MP4 on any ranked clip.' : 'Audio loaded for transcription. Upload a video file when you are ready to export clips.');

    try {
      let nextTranscript = '';
      let nextSource = 'Demo media transcript';
      let nextNotice = '';

      if (hasSupabaseConfig) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);

        const { data, error } = await supabase.functions.invoke('transcribe-media', {
          body: formData,
        });

        if (!error && data?.transcript) {
          nextTranscript = data.transcript;
          nextSource = data.source || 'Uploaded media transcription';
          nextNotice = `Transcript created from ${file.name}. PodClipz ranked the strongest short-form moments below.`;
        } else {
          nextTranscript = buildDemoTranscriptFromMedia(file.name);
          const errorMessage = await getFunctionErrorMessage(error, data);
          nextNotice = `${errorMessage} Loaded a demo media transcript so you can test the clip ranking flow.`;
        }
      } else {
        nextTranscript = buildDemoTranscriptFromMedia(file.name);
        nextNotice = 'Demo mode: media transcription needs the Supabase transcribe-media function and an OpenAI API key. PodClipz loaded a demo transcript.';
      }

      setTranscript(nextTranscript);
      setTranscriptSource(nextSource);
      setResult(analyzeTopFiveClips(nextTranscript));
      setMediaNotice(nextNotice);
    } catch (error) {
      const nextTranscript = buildDemoTranscriptFromMedia(file.name);
      setTranscript(nextTranscript);
      setTranscriptSource('Demo media transcript');
      setResult(analyzeTopFiveClips(nextTranscript));
      setMediaNotice(`${error.message || 'Could not reach the media transcription service.'} Loaded a demo transcript so the clip analyzer still runs.`);
    } finally {
      setMediaBusy(false);
    }
  }

  function loadSample() {
    setTranscript(sampleClipTranscript);
    setTranscriptSource('Sample transcript');
    setResult(analyzeTopFiveClips(sampleClipTranscript));
    setSourceVideoFile(null);
    setClipExports({});
    setExportNotice('');
  }

  function updateBrandKit(field, value) {
    setBrandKit((current) => ({ ...current, [field]: value }));
  }

  function chooseBrandLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScheduleNotice('Choose a PNG, JPG, or WebP image for the custom brand logo.');
      return;
    }

    setBrandLogo({ name: file.name, url: URL.createObjectURL(file) });
    setScheduleNotice(`${file.name} added to the Brand Kit.`);
  }

  function toggleSchedulePlatform(platform) {
    setSchedulePlatforms((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]);
  }

  function scheduleSocialPost(event) {
    event.preventDefault();

    try {
      const post = createScheduledPost({
        clip: selectedScheduleClip,
        platforms: schedulePlatforms,
        date: scheduleDateTime.date,
        time: scheduleDateTime.time,
        brandName: brandKit.name,
        brandHandle: brandKit.handle,
      });
      setScheduledPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
      setScheduleNotice(`Clip #${post.clipRank} added to the social schedule for ${post.platforms.length} platforms.`);
    } catch (error) {
      setScheduleNotice(error.message);
    }
  }

  function removeScheduledPost(postId) {
    setScheduledPosts((current) => current.filter((post) => post.id !== postId));
    setScheduleNotice('Scheduled post removed.');
  }

  async function exportClip(clip) {
    if (!sourceVideoFile) {
      setExportNotice('Upload a source video file first, then PodClipz can cut/export the selected timestamp range.');
      return;
    }

    setExportingClipId(clip.id);
    setExportNotice(`Exporting clip #${clip.rank} as a vertical MP4...`);

    try {
      const formData = new FormData();
      formData.append('video', sourceVideoFile);
      formData.append('clipId', clip.id);
      formData.append('title', clip.productionPlan.overlayTitle);
      formData.append('startSeconds', String(clip.startSeconds));
      formData.append('durationSeconds', String(Math.min(90, clip.durationSeconds)));
      formData.append('caption', clip.caption);

      const response = await fetch(mediaApiUrl('/api/podclipz/export'), {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.downloadUrl) {
        throw new Error(payload.error || 'The PodClipz media backend could not export this clip.');
      }

      setClipExports((current) => ({ ...current, [clip.id]: payload }));
      setExportNotice(`Clip #${clip.rank} is ready. Download the MP4 from the card.`);
    } catch (error) {
      setExportNotice(`${error.message || 'Could not export clip.'} Make sure the media backend is running with npm run media.`);
    } finally {
      setExportingClipId('');
    }
  }

  async function copyClipPackage(clip) {
    const packageText = [
      `PodClipz clip #${clip.rank}`,
      `Brand: ${brandKit.name}${brandKit.handle ? ` (${brandKit.handle})` : ''}`,
      `Brand colors: ${brandKit.primaryColor} / ${brandKit.accentColor}`,
      `Score: ${clip.score}% (${clip.grade})`,
      `Time: ${clip.start} - ${clip.end} (${clip.durationSeconds}s)`,
      `Title: ${clip.productionPlan.overlayTitle}`,
      `Hook: ${clip.productionPlan.hookLine}`,
      '',
      clip.text,
      '',
      'Caption:',
      clip.caption,
      '',
      `Hashtags: ${clip.productionPlan.hashtags.join(' ')}`,
      '',
      'Edit notes:',
      ...clip.editNotes.map((note) => `- ${note}`),
    ].join('\n');

    await navigator.clipboard.writeText(packageText);
    setCopiedClipId(clip.id);
    window.setTimeout(() => setCopiedClipId(''), 1800);
  }

  return (
    <div className="clipAnalyzerGrid">
      <form className="adminForm clipInputPanel" onSubmit={runAnalysis}>
        <h2>Clip analyzer</h2>
        <p className="adminHelper">Upload audio/video or paste a YouTube link, then PodClipz creates a transcript and ranks the best moments for TikTok, Instagram Reels, YouTube Shorts, and Facebook.</p>
        <div className="clipWorkflow" aria-label="PodClipz workflow">
          {[
            ['1', 'Import'],
            ['2', 'Transcribe'],
            ['3', 'Score clips'],
            ['4', 'Package'],
          ].map(([number, label]) => (
            <span key={label}><b>{number}</b>{label}</span>
          ))}
        </div>
        <div className="mediaUploadTool">
          <div>
            <span><Upload size={17} /> Upload media <b>Recommended</b></span>
            <p>MP3, WAV, M4A, MP4, MOV, or WEBM. Transcription accepts 25 MB; video export supports larger files locally.</p>
          </div>
          <label className="uploadButton">
            {mediaBusy ? 'Transcribing...' : 'Upload & analyze'}
            <input
              accept="audio/*,video/mp4,video/quicktime,video/webm"
              disabled={mediaBusy}
              onChange={transcribeMedia}
              type="file"
            />
          </label>
        </div>
        {mediaNotice && <p className={`urlNotice ${acceptedMediaName ? '' : 'warning'}`}>{mediaNotice}</p>}
        {acceptedMediaName && (
          <div className="acceptedUrlCard">
            <span>{transcriptSource}</span>
            <strong>{acceptedMediaName}</strong>
            <p>PodClipz analyzes the generated transcript and scores clips by hook, clarity, emotion, usefulness, quote potential, and platform fit.</p>
          </div>
        )}
        <div className="youtubeUrlTool">
          <label>
            <span><Play size={17} /> YouTube URL</span>
            <input
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              inputMode="url"
              type="text"
            />
          </label>
          <button className="secondaryWide" type="button" onClick={useYoutubeUrl} disabled={urlBusy}>
            {urlBusy ? 'Generating...' : 'Generate transcript & analyze'}
          </button>
          <p className="youtubeReliabilityNote">YouTube can block transcript fetches. Upload media is the reliable Opus-style path.</p>
        </div>
        {urlNotice && <p className={`urlNotice ${acceptedYoutubeUrl ? '' : 'warning'}`}>{urlNotice}</p>}
        {acceptedYoutubeUrl && (
          <div className="acceptedUrlCard">
            <span>{transcriptSource}</span>
            <strong>{acceptedYoutubeUrl}</strong>
            <p>PodClipz analyzes the transcript below and scores clips by hook, clarity, emotion, usefulness, quote potential, and platform fit.</p>
          </div>
        )}
        <Field label="Generated transcript or show notes">
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="00:00 Speaker says something...&#10;00:22 Strong opinion, story, lesson, or debate..."
            rows="13"
            required
          />
        </Field>
        <div className="clipActions">
          <button className="adminPrimary" type="submit"><Sparkles size={18} /> Analyze clips</button>
          <button className="secondaryWide" type="button" onClick={loadSample}>Load sample</button>
        </div>
        {exportNotice && <p className={`urlNotice ${sourceVideoFile ? '' : 'warning'}`}>{exportNotice}</p>}
        <p className="clipFootnote">Scores are guidance, not guarantees. Use the top moments as editing leads, then judge by your audience and platform.</p>
      </form>

      <div className="clipResultsPanel">
        <div className="clipResultsHeader">
          <div>
            <h2>Top 5 clip candidates</h2>
            <p>{result ? `Showing ${result.candidates.length} ranked clips · top score ${result.summary.topScore}% · average ${result.summary.averageScore}% · best platform ${result.summary.recommendedPlatform}` : 'Add a YouTube URL, upload media, or run an analysis to see the top five clips.'}</p>
          </div>
        </div>

        {result ? (
          <div className="clipList">
            {result.candidates.slice(0, 5).map((clip) => (
              <article
                className="clipCandidate"
                key={clip.id}
                style={{ '--clip-brand-color': brandKit.primaryColor, '--clip-accent-color': brandKit.accentColor }}
              >
                <div className="clipScoreBlock">
                  <strong>{clip.score}%</strong>
                  <span>{clip.grade}</span>
                  <small>{clip.productionPlan.status}</small>
                </div>
                <div className="clipCandidateBody">
                  <div className="clipBrandStamp">
                    {brandLogo.url ? (
                      <img src={brandLogo.url} alt="" />
                    ) : (
                      <span style={{ backgroundColor: brandKit.primaryColor }}>{brandKit.name.trim().slice(0, 2).toUpperCase() || 'PB'}</span>
                    )}
                    <div>
                      <strong>{brandKit.name || 'My Podcast'}</strong>
                      <small>{brandKit.handle || 'Custom brand'}</small>
                    </div>
                  </div>
                  <div className="clipMeta">
                    <span>#{clip.rank}</span>
                    <span>{clip.start} - {clip.end}</span>
                    <span>{clip.durationSeconds}s</span>
                  </div>
                  <h3>{clip.headline}</h3>
                  <p>{clip.text}</p>
                  <div className="clipReasons">
                    {clip.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                  </div>
                  <div className="platformChips" aria-label="Recommended platforms">
                    {clip.platforms.slice(0, 4).map((platform) => (
                      <span key={platform.name}><b>{platform.name}</b> {platform.fit}%</span>
                    ))}
                  </div>
                  <div className="clipProductionKit">
                    <div>
                      <span>Opening hook</span>
                      <strong>{clip.productionPlan.hookLine}</strong>
                    </div>
                    <div>
                      <span>On-screen title</span>
                      <strong>{clip.productionPlan.overlayTitle}</strong>
                    </div>
                    <div>
                      <span>Hashtags</span>
                      <p>{clip.productionPlan.hashtags.join(' ')}</p>
                    </div>
                  </div>
                  <div className="exportPlan" aria-label="Export plan">
                    {clip.productionPlan.exports.map((item) => (
                      <span key={item.platform}>
                        <b>{item.platform}</b>
                        {item.format} · {item.length}
                      </span>
                    ))}
                  </div>
                  <div className="clipHandoff">
                    <div>
                      <strong>Suggested caption</strong>
                      <p>{clip.caption}</p>
                    </div>
                    <div>
                      <strong>Edit notes</strong>
                      <ul>
                        {clip.editNotes.map((note) => <li key={note}>{note}</li>)}
                      </ul>
                    </div>
                  </div>
                  <button className="copyPackageButton" type="button" onClick={() => copyClipPackage(clip)}>
                    <Copy size={16} />
                    {copiedClipId === clip.id ? 'Copied package' : 'Copy clip package'}
                  </button>
                  <div className="clipExportActions">
                    <button className="exportClipButton" type="button" onClick={() => exportClip(clip)} disabled={exportingClipId === clip.id || !sourceVideoFile}>
                      <Download size={16} />
                      {exportingClipId === clip.id ? 'Exporting MP4...' : 'Export vertical MP4'}
                    </button>
                    {clipExports[clip.id] && (
                      <a className="downloadClipLink" href={clipExports[clip.id].downloadUrl} download>
                        <Download size={16} />
                        Download MP4
                      </a>
                    )}
                  </div>
                  {clipExports[clip.id] && (
                    <div className="clipExportCard">
                      <strong>{clipExports[clip.id].format}</strong>
                      <span>{clipExports[clip.id].durationSeconds}s · {Math.round(clipExports[clip.id].sizeBytes / 1024 / 1024 * 10) / 10} MB</span>
                    </div>
                  )}
                  <div className="signalBars" aria-label="Clip scoring signals">
                    {Object.entries(clip.signals).map(([name, value]) => (
                      <div className="signalBar" key={name}>
                        <span>{name}</span>
                        <div><i style={{ width: `${value}%` }} /></div>
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyClipState">
            <Sparkles size={34} />
            <h3>Find the moments worth posting</h3>
            <p>Paste a transcript to get an Opus-style ranked list of short-form moments for TikTok, Reels, Shorts, and Facebook.</p>
          </div>
        )}
      </div>

      <section className="clipPublishingWorkspace" aria-label="Branding and social scheduling">
        <div className="publishingWorkspaceHeader">
          <div>
            <h2>Brand and schedule your top clips</h2>
            <p>Add your logo and colors once, then plan a post for every major short-form platform.</p>
          </div>
          <span><CalendarClock size={18} /> {scheduledPosts.length} scheduled</span>
        </div>

        <div className="brandSchedulerGrid">
          <section className="brandKitPanel" aria-labelledby="brand-kit-title">
            <div className="publishingPanelTitle">
              <Palette size={21} />
              <div>
                <h3 id="brand-kit-title">Custom Brand Kit</h3>
                <p>This branding appears on every ranked clip package.</p>
              </div>
            </div>

            <label className="brandLogoUpload">
              {brandLogo.url ? <img src={brandLogo.url} alt="Brand logo preview" /> : <ImagePlus size={28} />}
              <span>
                <strong>{brandLogo.name || 'Upload brand logo'}</strong>
                <small>PNG, JPG, or WebP</small>
              </span>
              <input accept="image/png,image/jpeg,image/webp" onChange={chooseBrandLogo} type="file" />
            </label>

            <div className="brandTextFields">
              <label>
                <span>Brand name</span>
                <input value={brandKit.name} onChange={(event) => updateBrandKit('name', event.target.value)} />
              </label>
              <label>
                <span>Social handle</span>
                <input value={brandKit.handle} onChange={(event) => updateBrandKit('handle', event.target.value)} placeholder="@yourpodcast" />
              </label>
            </div>

            <div className="brandColorFields">
              <label>
                <span>Primary color</span>
                <input aria-label="Primary brand color" type="color" value={brandKit.primaryColor} onChange={(event) => updateBrandKit('primaryColor', event.target.value)} />
                <b>{brandKit.primaryColor}</b>
              </label>
              <label>
                <span>Accent color</span>
                <input aria-label="Accent brand color" type="color" value={brandKit.accentColor} onChange={(event) => updateBrandKit('accentColor', event.target.value)} />
                <b>{brandKit.accentColor}</b>
              </label>
            </div>

            <div className="brandKitPreview" style={{ '--brand-preview-primary': brandKit.primaryColor, '--brand-preview-accent': brandKit.accentColor }}>
              {brandLogo.url ? <img src={brandLogo.url} alt="" /> : <span>{brandKit.name.trim().slice(0, 2).toUpperCase() || 'PB'}</span>}
              <div>
                <strong>{brandKit.name || 'My Podcast'}</strong>
                <small>{brandKit.handle || '@yourpodcast'}</small>
              </div>
            </div>
          </section>

          <form className="socialSchedulerPanel" onSubmit={scheduleSocialPost}>
            <div className="publishingPanelTitle">
              <CalendarClock size={21} />
              <div>
                <h3>Social scheduler</h3>
                <p>Plan one top clip across multiple platforms.</p>
              </div>
            </div>

            <label className="schedulerField">
              <span>Top-five clip</span>
              <select value={selectedScheduleClip?.id || ''} onChange={(event) => setScheduleClipId(event.target.value)} disabled={!selectedScheduleClip}>
                {result?.candidates.slice(0, 5).map((clip) => (
                  <option key={clip.id} value={clip.id}>#{clip.rank} · {clip.headline}</option>
                ))}
              </select>
            </label>

            <div className="scheduleDateFields">
              <label className="schedulerField">
                <span>Date</span>
                <input type="date" value={scheduleDateTime.date} onChange={(event) => setScheduleDateTime((current) => ({ ...current, date: event.target.value }))} required />
              </label>
              <label className="schedulerField">
                <span>Time</span>
                <input type="time" value={scheduleDateTime.time} onChange={(event) => setScheduleDateTime((current) => ({ ...current, time: event.target.value }))} required />
              </label>
            </div>

            <fieldset className="schedulerPlatforms">
              <legend>Publish to</legend>
              {SOCIAL_PLATFORMS.map((platform) => (
                <label className={schedulePlatforms.includes(platform) ? 'active' : ''} key={platform}>
                  <input
                    checked={schedulePlatforms.includes(platform)}
                    onChange={() => toggleSchedulePlatform(platform)}
                    type="checkbox"
                  />
                  <span>{platform}</span>
                </label>
              ))}
            </fieldset>

            <button className="schedulePostButton" type="submit" disabled={!selectedScheduleClip}>
              <Send size={18} /> Add to social schedule
            </button>
            <p className="schedulerApiNote">This creates the publishing plan. Automatic posting activates after each social account’s publishing API is connected.</p>
          </form>
        </div>

        <p className="scheduleNotice" aria-live="polite">{scheduleNotice}</p>

        <div className="scheduledQueue">
          <div className="scheduledQueueHeader">
            <h3>Upcoming social posts</h3>
            <span>{scheduledPosts.length ? `${scheduledPosts.length} planned` : 'Nothing scheduled yet'}</span>
          </div>
          {scheduledPosts.length ? (
            <div className="scheduledPostList">
              {scheduledPosts.map((post) => (
                <article className="scheduledPost" key={post.id}>
                  <div className="scheduledPostTime">
                    <CalendarClock size={19} />
                    <strong>{formatScheduledPostTime(post.scheduledAt)}</strong>
                  </div>
                  <div>
                    <span>Clip #{post.clipRank} · {post.brandName}</span>
                    <h4>{post.headline}</h4>
                    <p>{post.platforms.join(' · ')}</p>
                  </div>
                  <button type="button" aria-label={`Remove scheduled clip ${post.clipRank}`} onClick={() => removeScheduledPost(post.id)}>
                    <Trash2 size={17} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="scheduledQueueEmpty">
              <CalendarClock size={30} />
              <p>Choose one of the top five clips above and add it to the schedule.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PodReelsTool({ standalone = false }) {
  const [form, setForm] = useState(emptyPodReel);
  const [reels, setReels] = useState(() => samplePodReels());
  const [notice, setNotice] = useState('RodReelz are designed for 15 to 30 second podcast clips.');

  const durationValidation = validateReelDuration(Number(form.durationSeconds));

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function togglePlatform(platform) {
    setForm((current) => {
      const hasPlatform = current.platforms.includes(platform);
      return {
        ...current,
        platforms: hasPlatform
          ? current.platforms.filter((item) => item !== platform)
          : [...current.platforms, platform],
      };
    });
  }

  function saveReel(event) {
    event.preventDefault();
    try {
      const reel = createPodReel({ ...form, durationSeconds: Number(form.durationSeconds) });
      setReels((current) => [reel, ...current]);
      setNotice('RodReelz clip saved. It is ready to export as a vertical short.');
    } catch (error) {
      setNotice(error.message);
    }
  }

  const featured = reels[0];

  return (
    <section className={standalone ? 'podReelsShell publicPodReelsShell' : 'podReelsShell'} aria-label="RodReelz short-form podcast tool">
      <div className="podReelsHero">
        <div>
          <span className="sectionEyebrow"><Film size={16} /> RodReelz</span>
          <h1>{standalone ? 'RodReelz built for 15 to 30 seconds.' : 'RodReelz'}</h1>
          <p>Create vertical podcast shorts for Instagram Reels, YouTube Shorts, TikTok, and Facebook Reels. Keep every clip tight, captioned, and made to point people back to the full episode.</p>
        </div>
        <div className="phonePreview" aria-label="RodReelz phone preview">
          <div className="phoneFrame">
            <span>{featured.durationSeconds}s</span>
            <h2>{featured.title}</h2>
            <p>{featured.hook}</p>
            <b>{featured.platforms.join(' • ')}</b>
          </div>
        </div>
      </div>

      {notice && <div className={durationValidation.valid ? 'adminNotice' : 'adminNotice warning'}>{notice}</div>}

      <div className="podReelsGrid">
        <form className="adminForm" onSubmit={saveReel}>
          <h2>Create RodReelz</h2>
          <Field label="Reel title"><input value={form.title} onChange={(event) => updateForm('title', event.target.value)} required /></Field>
          <Field label="Opening hook"><input value={form.hook} onChange={(event) => updateForm('hook', event.target.value)} required /></Field>
          <div className="twoFields">
            <Field label="Source episode"><input value={form.sourceEpisode} onChange={(event) => updateForm('sourceEpisode', event.target.value)} /></Field>
            <Field label="Duration seconds"><input value={form.durationSeconds} onChange={(event) => updateForm('durationSeconds', event.target.value)} type="number" min="15" max="30" required /></Field>
          </div>
          <Field label="Caption"><textarea value={form.caption} onChange={(event) => updateForm('caption', event.target.value)} rows="4" /></Field>
          <div className="platformToggleGroup" aria-label="RodReelz platforms">
            {['Instagram Reels', 'YouTube Shorts', 'TikTok', 'Facebook Reels'].map((platform) => (
              <button className={form.platforms.includes(platform) ? 'active' : ''} key={platform} type="button" onClick={() => togglePlatform(platform)}>{platform}</button>
            ))}
          </div>
          <button className="adminPrimary" type="submit"><Film size={18} /> Save RodReelz</button>
          <p className="clipFootnote">Current version plans the reel. Actual video upload/edit/export is the next backend/media step.</p>
        </form>

        <div className="podReelsList">
          <h2>Reel queue</h2>
          {reels.map((reel) => (
            <article className="podReelCard" key={reel.id}>
              <div>
                <span>{reel.durationSeconds}s • {reel.status}</span>
                <h3>{reel.title}</h3>
                <p>{reel.hook}</p>
              </div>
              <div className="exportPlan" aria-label="RodReelz export plan">
                {reel.exports.map((item) => <span key={item.platform}><b>{item.platform}</b>{item.format} · {item.aspectRatio}</span>)}
              </div>
              <ul>
                {reel.checklist.slice(0, 4).map((item) => <li key={item}><Check size={14} /> {item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PiContactTool({ standalone = false }) {
  const [contacts, setContacts] = useState(fallbackPiContacts);
  const [contactForm, setContactForm] = useState(emptyPiContact);
  const [campaignForm, setCampaignForm] = useState(emptyPiCampaign);
  const [notice, setNotice] = useState('Podtacts is in demo mode. Connect an email provider before sending live email.');
  const [lastSend, setLastSend] = useState(null);

  const subscribedCount = contacts.filter((contact) => contact.status === 'subscribed').length;

  function updateContact(field, value) {
    setContactForm((current) => ({ ...current, [field]: value }));
  }

  function updateCampaign(field, value) {
    setCampaignForm((current) => ({ ...current, [field]: value }));
  }

  function savePiContact(event) {
    event.preventDefault();
    try {
      const next = addContact(contacts, contactForm);
      setContacts(next);
      setContactForm(emptyPiContact);
      setNotice('Contact saved with opt-in consent.');
    } catch (error) {
      setNotice(error.message);
    }
  }

  function sendPiCampaign(event) {
    event.preventDefault();
    try {
      const campaign = createCampaign(campaignForm);
      const result = sendCampaign(campaign, contacts);
      setLastSend(result);
      setNotice(`Demo send complete: ${result.sentCount} subscribed contacts prepared, ${result.skippedCount} skipped.`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  function unsubscribe(email) {
    setContacts((current) => unsubscribeContact(current, email));
    setNotice(`${email} unsubscribed from future Podtacts sends.`);
  }

  return (
    <section className={standalone ? 'piContactShell publicPiContactShell' : 'piContactShell'} aria-label="Podtacts email distribution tool">
      <div className="piContactHero">
        <div>
          <span className="sectionEyebrow"><Mail size={16} /> Podtacts</span>
          <h1>{standalone ? 'Podtacts email distribution for opt-in podcast contacts.' : 'Podtacts'}</h1>
          <p>Build a separate opt-in contact list, draft email campaigns, and prepare sends like Constant Contact — inside PodToolbox, but separate from membership usage.</p>
        </div>
        <div className="piContactStats">
          <span><b>Total contacts</b><strong>{contacts.length}</strong></span>
          <span><b>Opted in</b><strong>{subscribedCount}</strong></span>
          <span><b>Last send</b><strong>{lastSend ? lastSend.sentCount : 0}</strong></span>
        </div>
      </div>

      {notice && <div className="adminNotice">{notice}</div>}

      <div className="piContactGrid">
        <form className="adminForm" onSubmit={savePiContact}>
          <h2>Add opt-in contact</h2>
          <Field label="Name"><input value={contactForm.fullName} onChange={(event) => updateContact('fullName', event.target.value)} required /></Field>
          <Field label="Email"><input value={contactForm.email} onChange={(event) => updateContact('email', event.target.value)} type="email" required /></Field>
          <div className="twoFields">
            <Field label="Source"><input value={contactForm.source} onChange={(event) => updateContact('source', event.target.value)} /></Field>
            <Field label="Tags"><input value={contactForm.tags} onChange={(event) => updateContact('tags', event.target.value)} placeholder="newsletter, guests" /></Field>
          </div>
          <label className="consentCheck">
            <input checked={contactForm.consent} onChange={(event) => updateContact('consent', event.target.checked)} type="checkbox" />
            <span>This person opted in to receive email from Podtacts.</span>
          </label>
          <button className="adminPrimary" type="submit"><Plus size={18} /> Save contact</button>
        </form>

        <form className="adminForm" onSubmit={sendPiCampaign}>
          <h2>Create email campaign</h2>
          <Field label="Subject"><input value={campaignForm.subject} onChange={(event) => updateCampaign('subject', event.target.value)} required /></Field>
          <Field label="Preview text"><input value={campaignForm.previewText} onChange={(event) => updateCampaign('previewText', event.target.value)} /></Field>
          <Field label="Email body"><textarea value={campaignForm.body} onChange={(event) => updateCampaign('body', event.target.value)} rows="7" required /></Field>
          <button className="adminPrimary" type="submit"><Mail size={18} /> Prepare demo send</button>
          <p className="clipFootnote">Live sending needs a provider later, such as SendGrid, Mailgun, Resend, AWS SES, Constant Contact API, or SMTP.</p>
        </form>
      </div>

      <div className="piContactGrid piContactLowerGrid">
        <div className="adminTableCard">
          <h2>Podtacts list</h2>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Source</th><th>Tags</th><th>Action</th></tr></thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id || contact.email}>
                  <td>{contact.fullName}</td>
                  <td>{contact.email}</td>
                  <td>{contact.status}</td>
                  <td>{contact.source}</td>
                  <td>{contact.tags?.join(', ')}</td>
                  <td className="rowActions">
                    <button type="button" onClick={() => unsubscribe(contact.email)} aria-label={`Unsubscribe ${contact.email}`}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="piSendPreview">
          <h2>Send preview</h2>
          {lastSend ? (
            <>
              <p><strong>{lastSend.campaign.subject}</strong></p>
              <p>{lastSend.sentCount} messages prepared. Unsubscribed contacts were skipped automatically.</p>
              <pre>{lastSend.messages[0]?.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}</pre>
            </>
          ) : (
            <p>No campaign prepared yet. Add contacts, draft a message, then prepare a demo send.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminBackend({ initialTab = 'members', onExit }) {
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState(fallbackMembers);
  const [episodes, setEpisodes] = useState(fallbackEpisodes);
  const [payments, setPayments] = useState(fallbackPayments);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [episodeForm, setEpisodeForm] = useState(emptyEpisode);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingEpisodeId, setEditingEpisodeId] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [localDemoAdmin, setLocalDemoAdmin] = useState(false);
  const [clipTranscript, setClipTranscript] = useState(sampleClipTranscript);
  const [clipResult, setClipResult] = useState(() => analyzeTopFiveClips(sampleClipTranscript));
  const [settingsForm, setSettingsForm] = useState({ showName: 'Pod Toolbox', replyEmail: 'hello@podtoolbox.net', weeklyDigest: true });
  const [pendingDelete, setPendingDelete] = useState(null);

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
    setActiveTab(initialTab);
  }, [initialTab]);

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
    if (localDemoAdmin || !hasSupabaseConfig) {
      setMembers(fallbackMembers);
      setEpisodes(fallbackEpisodes);
      setPayments(fallbackPayments);
      setMessage('Demo data synced and restored. Live database writes activate after Supabase is connected.');
      return;
    }
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
    if (!hasSupabaseConfig || !session || !isAdmin) {
      setMembers((current) => current.filter((member) => member.id !== id));
      setMessage('Demo member deleted locally.');
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
    if (!hasSupabaseConfig || !session || !isAdmin) {
      setEpisodes((current) => current.filter((episode) => episode.id !== id));
      setMessage('Demo episode deleted locally.');
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
    setLocalDemoAdmin(false);
    onExit?.();
  }

  function saveSettings(event) {
    event.preventDefault();
    setMessage(`Settings saved locally for ${settingsForm.showName}.`);
  }

  async function confirmPendingDelete() {
    const item = pendingDelete;
    setPendingDelete(null);
    if (!item) return;
    if (item.type === 'member') await deleteMember(item.id);
    if (item.type === 'episode') await deleteEpisode(item.id);
  }

  function enableLocalDemo() {
    setLocalDemoAdmin(true);
    setIsAdmin(false);
    setMessage('Local demo admin is open. This lets you review the screens while Supabase email confirmation is pending.');
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
      {hasSupabaseConfig && !localDemoAdmin && (
        <AdminLogin
          session={session}
          message={message}
          setMessage={setMessage}
          enableLocalDemo={enableLocalDemo}
        />
      )}

      {(session || !hasSupabaseConfig || localDemoAdmin) && (
        <>
          {pendingDelete && (
            <div className="adminDeleteConfirm" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
              <div>
                <strong id="delete-confirm-title">Delete {pendingDelete.label}?</strong>
                <p>This action removes the item from the current workspace.</p>
              </div>
              <button type="button" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="danger" type="button" onClick={confirmPendingDelete}>Confirm delete</button>
            </div>
          )}
          <div className="adminTopbar">
            <div>
              <h1>Admin backend</h1>
              <p>{localDemoAdmin ? 'Local demo mode with sample data' : hasSupabaseConfig ? `Signed in as ${session?.user?.email || 'admin'}` : 'Demo mode with local sample data'}</p>
            </div>
            <div className="adminTopbarActions">
              <button type="button" onClick={loadData} disabled={busy}>
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

          {(isAdmin || !hasSupabaseConfig || localDemoAdmin) && (
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
                {['members', 'episodes', 'portal', 'reels', 'contacts', 'games', 'clips', 'payments', 'settings'].map((tab) => (
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
                              <button type="button" onClick={() => setPendingDelete({ type: 'member', id: member.id, label: member.full_name })} aria-label={`Delete ${member.full_name}`}><Trash2 size={16} /></button>
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
                              <button type="button" onClick={() => setPendingDelete({ type: 'episode', id: episode.id, label: episode.title })} aria-label={`Delete ${episode.title}`}><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'games' && (
                <PodcastGameView />
              )}

              {activeTab === 'reels' && (
                <PodReelsTool />
              )}

              {activeTab === 'contacts' && (
                <PiContactTool />
              )}

              {activeTab === 'clips' && (
                <ClipAnalyzerTool
                  transcript={clipTranscript}
                  setTranscript={setClipTranscript}
                  result={clipResult}
                  setResult={setClipResult}
                />
              )}

              {activeTab === 'portal' && (
                <div className="portalTool">
                  <section className="portalHero">
                    <div>
                      <span className="sectionEyebrow"><DoorOpen size={16} /> Portal</span>
                      <h2>Member and creator access hub</h2>
                      <p>Give members one clean doorway for plans, renewals, episode drops, and private creator updates.</p>
                    </div>
                    <a className="adminPrimary portalLaunch" href="#membership">
                      <ArrowRight size={18} />
                      Open portal preview
                    </a>
                  </section>

                  <div className="portalGrid">
                    <article className="portalCard">
                      <DoorOpen size={24} />
                      <h3>Member Portal</h3>
                      <p>Members can review their plan, renewal date, payment status, and gated show resources.</p>
                      <div className="portalMeta">
                        <span>Access: Members</span>
                        <strong>podtoolbox.net/portal</strong>
                      </div>
                    </article>

                    <article className="portalCard">
                      <Users size={24} />
                      <h3>Creator Portal</h3>
                      <p>Creators can jump into episodes, member notes, payments, and clip workflows from one place.</p>
                      <div className="portalMeta">
                        <span>Access: Team</span>
                        <strong>podtoolbox.net/creator</strong>
                      </div>
                    </article>

                    <article className="portalCard">
                      <ShieldCheck size={24} />
                      <h3>Secure Status</h3>
                      <p>Portal access is ready to connect to Supabase Auth and membership records.</p>
                      <div className="portalMeta">
                        <span>Status</span>
                        <strong>{hasSupabaseConfig ? 'Supabase connected' : 'Demo mode'}</strong>
                      </div>
                    </article>
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

              {activeTab === 'settings' && (
                <div className="adminGrid">
                  <form className="adminForm" onSubmit={saveSettings}>
                    <h2>Podcast settings</h2>
                    <Field label="Show name"><input value={settingsForm.showName} onChange={(event) => setSettingsForm((current) => ({ ...current, showName: event.target.value }))} required /></Field>
                    <Field label="Reply-to email"><input value={settingsForm.replyEmail} onChange={(event) => setSettingsForm((current) => ({ ...current, replyEmail: event.target.value }))} type="email" required /></Field>
                    <label className="consentCheck">
                      <input checked={settingsForm.weeklyDigest} onChange={(event) => setSettingsForm((current) => ({ ...current, weeklyDigest: event.target.checked }))} type="checkbox" />
                      <span>Send a weekly creator activity digest.</span>
                    </label>
                    <button className="adminPrimary" type="submit"><Save size={18} /> Save settings</button>
                  </form>

                  <div className="adminTableCard">
                    <h2>Workspace status</h2>
                    <p><strong>{settingsForm.showName}</strong></p>
                    <p>Replies go to {settingsForm.replyEmail}.</p>
                    <p>{settingsForm.weeklyDigest ? 'Weekly digest is enabled.' : 'Weekly digest is disabled.'}</p>
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

function PodClipzWorkbench({ transcript, setTranscript, result, setResult }) {
  return (
    <section className="publicClipzShell">
      <div className="publicClipzIntro">
        <span className="sectionEyebrow"><Sparkles size={16} /> PodClipz</span>
        <h1>Find the clips with the best chance to perform.</h1>
        <p>Paste a YouTube URL, generate the transcript when captions are available, and rank the strongest moments for Facebook, Instagram Reels, TikTok, and YouTube Shorts.</p>
      </div>
      <ClipAnalyzerTool
        transcript={transcript}
        setTranscript={setTranscript}
        result={result}
        setResult={setResult}
      />
    </section>
  );
}

function PodVerterTool() {
  const [sourceFile, setSourceFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [busy, setBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [notice, setNotice] = useState('Choose a file and output format to begin.');
  const [noticeType, setNoticeType] = useState('info');
  const [conversion, setConversion] = useState(null);
  const outputFormats = availablePodVerterFormats(sourceFile?.type);

  function chooseFile(event) {
    const file = event.target.files?.[0] || null;
    setSourceFile(file);
    setConversion(null);

    if (!file) {
      setNotice('Choose a file and output format to begin.');
      setNoticeType('info');
      return;
    }

    if (!isPodVerterMediaFile(file)) {
      setSourceFile(null);
      setNotice('PODVerter accepts audio and video files only.');
      setNoticeType('error');
      return;
    }

    const formats = availablePodVerterFormats(file.type);
    if (!formats.some((format) => format.value === outputFormat)) {
      setOutputFormat(formats[0].value);
    }

    setNotice(`${file.name} is ready to convert.`);
    setNoticeType('success');
  }

  async function convertFile(event) {
    event.preventDefault();
    if (!sourceFile) {
      setNotice('Choose an audio or video file first.');
      setNoticeType('error');
      return;
    }

    setBusy(true);
    setConversion(null);
    setNotice(`Converting ${sourceFile.name} to ${outputFormat.toUpperCase()}...`);
    setNoticeType('info');

    try {
      const formData = new FormData();
      formData.append('media', sourceFile);
      formData.append('format', outputFormat);

      const response = await fetch(mediaApiUrl('/api/podverter/convert'), {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.downloadUrl) {
        throw new Error(payload.error || 'PODVerter could not convert this file.');
      }

      setConversion(payload);
      setNotice(`${payload.fileName} is ready to download.`);
      setNoticeType('success');
    } catch (error) {
      setNotice(`${error.message || 'PODVerter could not convert this file.'} Make sure the media service is running with npm run media.`);
      setNoticeType('error');
    } finally {
      setBusy(false);
    }
  }

  async function downloadConversion() {
    if (!conversion?.downloadUrl) return;

    setDownloadBusy(true);
    setNotice(`Preparing ${conversion.fileName} for download...`);
    setNoticeType('info');

    try {
      const response = await fetch(conversion.downloadUrl);
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok || contentType.includes('application/json')) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'The converted file is no longer available. Convert it again, then download right away.');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = conversion.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setNotice(`${conversion.fileName} downloaded.`);
      setNoticeType('success');
    } catch (error) {
      setNotice(error.message || 'PODVerter could not download the converted file. Convert it again and retry.');
      setNoticeType('error');
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <section className="podVerterShell" aria-labelledby="podverter-title">
      <div className="podVerterIntro">
        <div>
          <h1 id="podverter-title">PODVerter</h1>
          <p>Turn podcast audio and video into the format you need—without leaving Pod Toolbox.</p>
        </div>
        <div className="podVerterMark" aria-hidden="true">
          <FileAudio size={42} />
          <RefreshCw size={28} />
          <FileVideo size={42} />
        </div>
      </div>

      <div className="podVerterWorkspace">
        <form className="podVerterPanel" onSubmit={convertFile}>
          <div className="podVerterPanelHeader">
            <h2>Convert a file</h2>
            <p>Audio up to 1 GB · Video up to 1 GB</p>
          </div>

          <label className="podVerterDropzone">
            <Upload size={28} />
            <strong>{sourceFile ? sourceFile.name : 'Choose audio or video'}</strong>
            <span>{sourceFile ? `${sourceFile.type || 'Media file'} · ${formatPodVerterBytes(sourceFile.size)}` : 'MP3, WAV, M4A, MP4, MOV, or WebM'}</span>
            <input accept="audio/*,video/*" onChange={chooseFile} type="file" />
          </label>

          <label className="podVerterField">
            <span>Convert to</span>
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}>
              {outputFormats.map((format) => (
                <option key={format.value} value={format.value}>{format.label}</option>
              ))}
            </select>
          </label>

          <button className="podVerterConvertButton" disabled={!sourceFile || busy} type="submit">
            <RefreshCw className={busy ? 'podVerterSpinner' : ''} size={20} />
            {busy ? 'Converting...' : 'Convert file'}
          </button>

          <p className={`podVerterNotice ${noticeType}`} aria-live="polite">{notice}</p>
        </form>

        <aside className="podVerterResult" aria-label="PODVerter output">
          {conversion ? (
            <>
              <div className="podVerterResultIcon"><Check size={34} /></div>
              <span>Conversion complete</span>
              <h2>{conversion.fileName}</h2>
              <p>{conversion.formatLabel} · {formatPodVerterBytes(conversion.sizeBytes)}</p>
              <button className="downloadClipLink" type="button" onClick={downloadConversion} disabled={downloadBusy}>
                <Download size={19} /> {downloadBusy ? 'Preparing...' : `Download ${conversion.format.toUpperCase()}`}
              </button>
            </>
          ) : (
            <>
              <div className="podVerterResultIcon idle"><Download size={34} /></div>
              <span>Your converted file</span>
              <h2>Ready when you are.</h2>
              <p>After conversion, the downloadable file will appear here.</p>
            </>
          )}
        </aside>
      </div>

      <div className="podVerterFormats" aria-label="Supported PODVerter formats">
        <strong>Audio outputs</strong><span>MP3</span><span>WAV</span><span>M4A</span>
        <strong>Video outputs</strong><span>MP4</span><span>WebM</span>
      </div>
    </section>
  );
}

function viewFromHash() {
  const hash = window.location.hash.toLowerCase();

  if (hash === '#admin') return 'admin';
  if (hash === '#podclipz' || hash === '#clipz') return 'clipz';
  if (hash === '#podreels' || hash === '#reels') return 'reels';
  if (hash === '#picontact' || hash === '#contacts') return 'contacts';
  if (hash === '#game') return 'game';
  if (hash === '#podverter' || hash === '#converter') return 'podverter';

  return 'site';
}

function App() {
  const [view, setView] = useState(() => viewFromHash());
  const [adminTab, setAdminTab] = useState('members');
  const [publicClipTranscript, setPublicClipTranscript] = useState(sampleClipTranscript);
  const [publicClipResult, setPublicClipResult] = useState(() => analyzeTopFiveClips(sampleClipTranscript));

  useEffect(() => {
    function syncViewFromHash() {
      setView(viewFromHash());
    }

    window.addEventListener('hashchange', syncViewFromHash);
    return () => window.removeEventListener('hashchange', syncViewFromHash);
  }, []);

  function openView(nextView, hash) {
    setView(nextView);
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function openWebsite(event) {
    if (event?.currentTarget?.getAttribute('href')) {
      setView('site');
      return;
    }
    openView('site', '#top');
  }

  function openAdmin(nextTab = 'members') {
    setAdminTab(typeof nextTab === 'string' ? nextTab : 'members');
    openView('admin', '#admin');
  }

  function openPodClipz() {
    openView('clipz', '#podclipz');
  }

  function openGame() {
    openView('game', '#game');
  }

  function openPiContact() {
    openView('contacts', '#picontact');
  }

  function openPodReels() {
    openView('reels', '#podreels');
  }

  function openPodVerter() {
    openView('podverter', '#podverter');
  }

  return (
    <main id="top">
      <Header view={view} openWebsite={openWebsite} openAdmin={openAdmin} openPodClipz={openPodClipz} openGame={openGame} openPiContact={openPiContact} openPodReels={openPodReels} openPodVerter={openPodVerter} />
      {view === 'admin' && <AdminBackend initialTab={adminTab} onExit={() => openView('site', '#top')} />}
      {view === 'contacts' && <PiContactTool standalone />}
      {view === 'reels' && <PodReelsTool standalone />}
      {view === 'game' && <PodcastGameView />}
      {view === 'podverter' && <PodVerterTool />}
      {view === 'clipz' && (
        <PodClipzWorkbench
          transcript={publicClipTranscript}
          setTranscript={setPublicClipTranscript}
          result={publicClipResult}
          setResult={setPublicClipResult}
        />
      )}
      {view === 'site' && <WebsiteView openPodClipz={openPodClipz} openGame={openGame} openPiContact={openPiContact} openPodReels={openPodReels} openAdmin={openAdmin} />}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
