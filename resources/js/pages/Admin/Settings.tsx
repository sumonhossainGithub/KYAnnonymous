import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import type { ChatRoomSummary, SiteSettings } from '@/types';
import { siteThemeStyle } from '@/lib/siteTheme';

type Room = ChatRoomSummary & { is_active: boolean };
type Props = { settings: SiteSettings; defaults: SiteSettings; rooms: Room[] };
const tabs = ['Branding', 'Content', 'Community', 'Chat', 'Rooms'] as const;
const adminLinks = [['Dashboard', 'dashboard'], ['Members', 'users'], ['Posts', 'posts'], ['Reports', 'reports'], ['Notices', 'notices'], ['Organizations', 'organizations'], ['Room moderation', 'chat-rooms'], ['Privacy tools', 'stealth'], ['Audit logs', 'audit-logs'], ['Security events', 'security-events'], ['System health', 'system-health']];

function RoomEditor({ room }: { room?: Room }) {
  const form = useForm({ name: room?.name || '', description: room?.description || '', is_active: room?.is_active ?? true });
  return <form className="settings-room" onSubmit={event => { event.preventDefault(); form.post(`/admin/settings/rooms${room ? `/${room.public_id}` : ''}`, { preserveScroll: true, onSuccess: () => { if (!room) form.reset(); } }); }}>
    <h3>{room ? `Edit ${room.name}` : 'Create a room'}</h3>
    <label>Room name<input aria-label={room ? `Name for ${room.name}` : 'New room name'} value={form.data.name} required minLength={3} maxLength={60} onChange={event => form.setData('name', event.target.value)} /></label>
    <label>Description<textarea value={form.data.description} maxLength={240} rows={2} onChange={event => form.setData('description', event.target.value)} /></label>
    <label className="settings-toggle"><input type="checkbox" checked={form.data.is_active} onChange={event => form.setData('is_active', event.target.checked)} />Room is open</label>
    {Object.entries(form.errors).map(([key, value]) => <p className="field-error" role="alert" key={key}>{value}</p>)}
    <button className="button" disabled={form.processing}>{form.processing ? 'Saving…' : room ? 'Save room' : 'Create room'}</button>
  </form>;
}

export default function Settings({ settings, defaults, rooms }: Props) {
  const form = useForm<SiteSettings>(settings);
  const [tab, setTab] = useState<typeof tabs[number]>('Branding');
  const field = (key: keyof SiteSettings, label: string, type = 'text', help?: string, min?: number, max?: number) => <label className="settings-field" key={key}>
    <span>{label}</span>
    {type === 'textarea' ? <textarea rows={key.endsWith('_text') ? 5 : 3} value={String(form.data[key])} onChange={event => form.setData(key, event.target.value)} /> : <input type={type} min={min} max={max} value={String(form.data[key])} onChange={event => form.setData(key, type === 'number' ? Number(event.target.value) : event.target.value)} />}
    {help && <small>{help}</small>}{form.errors[key] && <span className="field-error">{form.errors[key]}</span>}
  </label>;
  const toggle = (key: keyof SiteSettings, label: string, help: string) => <label className="settings-toggle" key={key}><input type="checkbox" checked={Boolean(form.data[key])} onChange={event => form.setData(key, event.target.checked)} /><span>{label}<small>{help}</small></span></label>;
  const select = (key: keyof SiteSettings, label: string, options: [string, string][]) => <label className="settings-field"><span>{label}</span><select value={String(form.data[key])} onChange={event => form.setData(key, event.target.value)}>{options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select>{form.errors[key] && <span className="field-error">{form.errors[key]}</span>}</label>;

  return <AppLayout><div className="settings-page">
    <header className="settings-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>Make this community yours.</h1><p>Customize the website and decide how your community works.</p></div><Link href="/" className="button secondary">View website</Link></header>
    <nav className="settings-admin-links" aria-label="Administration">{adminLinks.map(([label, path]) => <Link key={path} href={`/admin/${path}`}>{label}</Link>)}</nav>
    <div className="settings-tabs" role="tablist" aria-label="Customization sections">{tabs.map(name => <button type="button" key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>)}</div>
    <div className="settings-layout">
      <div>
        {tab !== 'Rooms' ? <form className="settings-form" onSubmit={event => { event.preventDefault(); form.post('/admin/settings', { preserveScroll: true, onSuccess: () => form.setDefaults() }); }}>
          {Object.keys(form.errors).length > 0 && <div role="alert" className="flash error"><strong>Please correct these settings:</strong><ul>{Object.entries(form.errors).map(([key, error]) => <li key={key}>{key.replaceAll('_', ' ')}: {error}</li>)}</ul></div>}
          {tab === 'Branding' && <section><h2>Brand and appearance</h2><div className="settings-grid">
            {field('site_name', 'Website name')}{field('tagline', 'Tagline')}{field('logo_text', 'Logo symbol or initials', 'text', 'Up to 8 characters. Use an emoji or your community initials.')}
            {field('primary_color', 'Accent color', 'color')}{field('background_color', 'Background color', 'color')}{field('surface_color', 'Panel color', 'color')}
            {field('corner_radius', 'Corner radius', 'number', '0 for square corners, up to 24 for rounded panels.', 0, 24)}
            {select('font_family', 'Text style', [['system', 'Modern sans serif'], ['mono', 'Monospace'], ['serif', 'Classic serif']])}
            {select('density', 'Spacing', [['comfortable', 'Comfortable'], ['compact', 'Compact']])}
          </div>{toggle('animations_enabled', 'Animated backgrounds', 'Allow background stars and motion. Visitors can still pause motion.')}</section>}
          {tab === 'Content' && <section><h2>Homepage and content</h2><div className="settings-grid">
            {select('homepage_layout', 'Homepage', [['chat', 'Live public chat'], ['feed', 'Community feed']])}
            {select('default_room_slug', 'Default chat room', rooms.filter(room => room.is_active).map(room => [room.slug, room.name]))}
            {field('homepage_title', 'Homepage heading')}{field('homepage_description', 'Homepage introduction', 'textarea')}
          </div>{field('welcome_message', 'Chat welcome message', 'textarea')}
            {toggle('announcement_enabled', 'Show announcement banner', 'Displays on every page.')}{field('announcement_text', 'Announcement text', 'textarea')}
            {field('footer_text', 'Footer text')}{field('rules_text', 'Community rules', 'textarea', 'Plain text. Leave blank to use the existing rules page.')}
            {field('privacy_text', 'Privacy policy', 'textarea', 'Plain text. Leave blank to use the existing privacy page.')}
          </section>}
          {tab === 'Community' && <section><h2>Community permissions</h2>
            {toggle('registration_enabled', 'Allow new registrations', 'Existing members can still sign in when registration is closed.')}
            {toggle('member_rooms_enabled', 'Members can create rooms', 'Administrators can always create and manage rooms here.')}
            {toggle('posts_enabled', 'Members can publish posts', 'Pause new member posts while keeping existing posts readable.')}
            {toggle('comments_enabled', 'Allow new comments', 'Existing discussions remain visible.')}
            {toggle('anonymous_enabled', 'Allow anonymous aliases', 'Allow members to hide their displayed handle in new posts and chat messages.')}
          </section>}
          {tab === 'Chat' && <section><h2>Chat behavior</h2>
            {toggle('chat_enabled', 'Allow new messages', 'Pause sending for everyone. Existing conversations remain readable.')}
            {toggle('guest_chat_enabled', 'Allow guest messages', 'When disabled, visitors must sign in before sending.')}
            {toggle('replies_enabled', 'Allow reply threads', 'Keep existing threads visible while controlling new replies.')}
            <div className="settings-grid">{field('message_max_length', 'Maximum message length', 'number', '50–2,000 characters.', 50, 2000)}
              {field('message_rate_limit', 'Member messages per minute', 'number', '1–60 per member.', 1, 60)}
              {field('guest_rate_limit', 'Guest messages per minute', 'number', '1–30 per guest connection.', 1, 30)}
              {field('poll_interval', 'Update interval (milliseconds)', 'number', '1,000–10,000. Background updates never navigate the page.', 1000, 10000)}
              {field('history_limit', 'Recent top-level messages', 'number', '10–100 messages loaded per room. Does not delete member history.', 10, 100)}
              {field('guest_retention_minutes', 'Guest history lifetime (minutes)', 'number', 'Expired guest messages are removed when conversations are loaded.', 1, 1440)}
            </div>
          </section>}
          <div className="settings-save"><span role="status">{form.isDirty ? 'You have unsaved changes' : 'All changes saved'}</span><div><button type="button" className="button secondary" onClick={() => form.reset()} disabled={!form.isDirty}>Discard changes</button><button className="button" disabled={form.processing || !form.isDirty}>{form.processing ? 'Saving…' : 'Save settings'}</button></div></div>
          <button type="button" className="text-link mt-4" onClick={() => form.setData({ ...defaults, default_room_slug: rooms.find(room => room.slug === defaults.default_room_slug && room.is_active)?.slug || rooms.find(room => room.is_active)?.slug || settings.default_room_slug })}>Restore defaults in preview</button>
        </form> : <section className="settings-form"><h2>Room management</h2><p>Edit names and descriptions, create new rooms, or close rooms to new conversations. Existing room links are preserved.</p><RoomEditor />{rooms.map(room => <RoomEditor key={room.public_id} room={room} />)}</section>}
      </div>
      <aside className="settings-preview"><span className="eyebrow">LIVE PREVIEW · NOT SAVED YET</span><div className={`site-theme preview-surface density-${form.data.density}`} style={siteThemeStyle(form.data)}>
        <header><span className="preview-logo">{form.data.logo_text}</span><div><strong>{form.data.site_name}</strong><small>{form.data.tagline}</small></div></header>
        {form.data.announcement_enabled && <p className="site-announcement">{form.data.announcement_text || 'Your announcement'}</p>}
        <h2>{form.data.homepage_title}</h2><p>{form.data.homepage_description}</p><div className="preview-card"><strong>A place to connect</strong><p>{form.data.welcome_message}</p><button type="button" className="button" tabIndex={-1}>Join the conversation</button></div><small>{form.data.footer_text}</small>
      </div><p className="settings-preview-note">Preview updates while you edit. Save to apply changes across the website.</p></aside>
    </div>
  </div></AppLayout>;
}
