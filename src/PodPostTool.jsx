import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  Cloud,
  Copy,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import { podpostSupabase } from './lib/podpostSupabase.js';
import podpostLogo from '../assets/podpost-logo-light.png';

const platforms = ['X', 'Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube Shorts'];

function tomorrowAtTen() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return {
    date: date.toISOString().slice(0, 10),
    time: '10:00',
  };
}

function tagsFromKeywords(keywords) {
  return String(keywords || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((item) => `#${item.replace(/[^a-z0-9]/gi, '')}`)
    .join(' ');
}

function buildCampaign(form) {
  const hashtags = tagsFromKeywords(form.keywords);
  const caption = `${form.brand}: ${form.topic}. Created for ${form.audience}. ${form.cta}. ${hashtags}`.trim();
  return {
    title: `${form.topic} | ${form.brand}`,
    caption,
    hashtags,
  };
}

export default function PodPostTool() {
  const initialSchedule = useMemo(() => tomorrowAtTen(), []);
  const [session, setSession] = useState(null);
  const [showCloud, setShowCloud] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    brand: 'Pod Toolbox',
    topic: 'Turn one podcast episode into a week of social content',
    audience: 'independent podcasters and creators',
    cta: 'Open PodPost and plan your next campaign',
    tone: 'confident, practical, creator-first',
    keywords: 'podcast marketing, content repurposing, creator tools',
  });
  const [campaign, setCampaign] = useState(() => buildCampaign(form));
  const [artwork, setArtwork] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([...platforms]);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [notice, setNotice] = useState('Generate your campaign, add artwork, then choose when it should go out.');

  useEffect(() => {
    let active = true;
    podpostSupabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = podpostSupabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    podpostSupabase
      .from('podpost_schedules')
      .select('id,title,caption,platforms,scheduled_at,status')
      .order('scheduled_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setScheduledPosts(data || []);
      });
  }, [session]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function generateCampaign(event) {
    event.preventDefault();
    const nextCampaign = buildCampaign(form);
    setCampaign(nextCampaign);
    setNotice('Campaign package generated. Review it, add your artwork, and schedule it.');
  }

  function chooseArtwork(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setNotice('Choose a JPG, PNG, or WebP image smaller than 10 MB.');
      return;
    }
    if (artwork?.url) URL.revokeObjectURL(artwork.url);
    setArtwork({ file, url: URL.createObjectURL(file) });
    setNotice(`${file.name} is ready for this campaign.`);
  }

  function togglePlatform(platform) {
    setSelectedPlatforms((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]);
  }

  async function authenticate(event) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
      setAuthNotice('Enter a valid email and a password with at least 6 characters.');
      return;
    }
    setBusy(true);
    const result = authMode === 'signup'
      ? await podpostSupabase.auth.signUp({ email, password })
      : await podpostSupabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setAuthNotice(result.error.message);
      return;
    }
    setAuthNotice(authMode === 'signup' && !result.data.session
      ? 'Check your email to confirm your new PodPost account.'
      : 'Cloud sync connected.');
    if (result.data.session) setShowCloud(false);
  }

  async function scheduleCampaign(event) {
    event.preventDefault();
    if (!selectedPlatforms.length) {
      setNotice('Choose at least one social platform.');
      return;
    }
    const scheduledAt = new Date(`${schedule.date}T${schedule.time}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      setNotice('Choose a future date and time.');
      return;
    }

    setBusy(true);
    let artworkId = null;
    if (session?.user && artwork?.file) {
      const extension = artwork.file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
      const upload = await podpostSupabase.storage.from('podpost-artwork').upload(path, artwork.file);
      if (upload.error) {
        setBusy(false);
        setNotice(upload.error.message);
        return;
      }
      const savedArtwork = await podpostSupabase.from('podpost_artwork').insert({
        owner_id: session.user.id,
        storage_path: path,
        original_name: artwork.file.name,
        mime_type: artwork.file.type,
        size_bytes: artwork.file.size,
      }).select('id').single();
      artworkId = savedArtwork.data?.id || null;
    }

    const newPost = {
      id: crypto.randomUUID(),
      title: campaign.title,
      caption: campaign.caption,
      platforms: selectedPlatforms,
      scheduled_at: scheduledAt.toISOString(),
      status: 'waiting_connection',
    };

    if (session?.user) {
      const saved = await podpostSupabase.from('podpost_schedules').insert({
        owner_id: session.user.id,
        artwork_id: artworkId,
        title: newPost.title,
        caption: newPost.caption,
        platforms: newPost.platforms,
        scheduled_at: newPost.scheduled_at,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Detroit',
        status: 'waiting_connection',
      }).select('id,title,caption,platforms,scheduled_at,status').single();
      if (saved.error) {
        setBusy(false);
        setNotice(saved.error.message);
        return;
      }
      setScheduledPosts((current) => [saved.data, ...current]);
      setNotice('Campaign saved to your private PodPost cloud schedule.');
    } else {
      setScheduledPosts((current) => [newPost, ...current]);
      setNotice('Campaign scheduled in this browser. Sign in to save it to the cloud.');
    }
    setBusy(false);
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(campaign.caption);
    setNotice('Caption copied.');
  }

  return (
    <section className="podPostShell" aria-label="PodPost social campaign tool">
      <div className="podPostIntro">
        <img src={podpostLogo} alt="PodPost" />
        <div>
          <h1>Build the post once. Plan every platform.</h1>
          <p>Create your campaign copy, upload finished artwork, and schedule the complete social package from one workspace.</p>
        </div>
        <button className={`podPostCloudButton ${session ? 'connected' : ''}`} type="button" onClick={() => setShowCloud(true)}>
          <Cloud size={19} /> {session ? 'Cloud connected' : 'Cloud sync'}
        </button>
      </div>

      <div className="podPostWorkspace">
        <form className="podPostBrief" onSubmit={generateCampaign}>
          <div className="podPostPanelHeading">
            <span>1</span>
            <div><h2>Campaign brief</h2><p>Tell PodPost what you are promoting.</p></div>
          </div>
          <label>Brand or show<input value={form.brand} onChange={(event) => updateForm('brand', event.target.value)} required /></label>
          <label>Topic or announcement<textarea value={form.topic} onChange={(event) => updateForm('topic', event.target.value)} required /></label>
          <div className="podPostFieldRow">
            <label>Audience<input value={form.audience} onChange={(event) => updateForm('audience', event.target.value)} required /></label>
            <label>Tone<input value={form.tone} onChange={(event) => updateForm('tone', event.target.value)} /></label>
          </div>
          <label>Call to action<input value={form.cta} onChange={(event) => updateForm('cta', event.target.value)} required /></label>
          <label>SEO keywords<input value={form.keywords} onChange={(event) => updateForm('keywords', event.target.value)} /></label>
          <button className="podPostPrimary" type="submit"><Sparkles size={19} /> Generate campaign</button>
        </form>

        <div className="podPostOutput">
          <div className="podPostPanelHeading">
            <span>2</span>
            <div><h2>Campaign package</h2><p>Review the copy and add your artwork.</p></div>
          </div>
          <article className="podPostCaptionCard">
            <div><strong>{campaign.title}</strong><button type="button" onClick={copyCaption} aria-label="Copy campaign caption"><Copy size={17} /> Copy</button></div>
            <p>{campaign.caption}</p>
          </article>
          <label className="podPostArtworkDrop">
            {artwork ? <img src={artwork.url} alt="Selected campaign artwork" /> : <ImagePlus size={38} />}
            <strong>{artwork ? artwork.file.name : 'Upload custom artwork'}</strong>
            <span>JPG, PNG, or WebP · maximum 10 MB</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseArtwork} />
          </label>
        </div>

        <form className="podPostScheduler" onSubmit={scheduleCampaign}>
          <div className="podPostPanelHeading">
            <span>3</span>
            <div><h2>Publishing scheduler</h2><p>Choose when and where this campaign goes out.</p></div>
          </div>
          <div className="podPostFieldRow">
            <label>Publish date<input type="date" value={schedule.date} onChange={(event) => setSchedule((current) => ({ ...current, date: event.target.value }))} required /></label>
            <label>Publish time<input type="time" value={schedule.time} onChange={(event) => setSchedule((current) => ({ ...current, time: event.target.value }))} required /></label>
          </div>
          <fieldset className="podPostPlatforms">
            <legend>Publish to</legend>
            {platforms.map((platform) => (
              <label className={selectedPlatforms.includes(platform) ? 'selected' : ''} key={platform}>
                <input type="checkbox" checked={selectedPlatforms.includes(platform)} onChange={() => togglePlatform(platform)} />
                <Check size={15} /> {platform}
              </label>
            ))}
          </fieldset>
          <button className="podPostPrimary" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="podPostSpinner" size={19} /> : <CalendarClock size={19} />}
            {busy ? 'Saving…' : 'Schedule campaign'}
          </button>
          <p className="podPostNotice" aria-live="polite">{notice}</p>
        </form>
      </div>

      <div className="podPostQueue">
        <div><h2>Upcoming campaigns</h2><span>{scheduledPosts.length} scheduled</span></div>
        {scheduledPosts.length ? scheduledPosts.map((post) => (
          <article key={post.id}>
            <CalendarClock size={20} />
            <div><strong>{post.title}</strong><span>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(post.scheduled_at))}</span></div>
            <span>{post.platforms.join(' · ')}</span>
            <small>{post.status === 'waiting_connection' ? 'Waiting for account connections' : post.status}</small>
          </article>
        )) : <p>No campaigns scheduled yet.</p>}
      </div>

      {showCloud && (
        <div className="podPostModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCloud(false); }}>
          <section className="podPostModal" role="dialog" aria-modal="true" aria-labelledby="podpost-cloud-title">
            <Cloud size={27} />
            <h2 id="podpost-cloud-title">PodPost cloud</h2>
            {session ? (
              <>
                <p>Cloud sync is connected as <strong>{session.user.email}</strong>.</p>
                <button className="podPostPrimary" type="button" onClick={() => { podpostSupabase.auth.signOut(); setShowCloud(false); }}><LogOut size={18} /> Sign out</button>
              </>
            ) : (
              <form onSubmit={authenticate}>
                <p>Sign in to keep artwork and scheduled campaigns in your private Supabase workspace.</p>
                <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
                <label>PodPost password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} required /></label>
                <button className="podPostPrimary" type="submit" disabled={busy}><Cloud size={18} /> {authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
                <button className="podPostTextButton" type="button" onClick={() => { setAuthMode((current) => current === 'signin' ? 'signup' : 'signin'); setAuthNotice(''); }}>
                  {authMode === 'signin' ? 'Create a new account' : 'I already have an account'}
                </button>
                <p className="podPostAuthNotice" aria-live="polite">{authNotice}</p>
              </form>
            )}
            <button className="podPostModalClose" type="button" onClick={() => setShowCloud(false)} aria-label="Close PodPost cloud">×</button>
          </section>
        </div>
      )}
    </section>
  );
}
