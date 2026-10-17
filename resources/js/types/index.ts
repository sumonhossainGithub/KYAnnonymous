export interface User {
  public_id: string;
  display_name: string;
  username: string;
  role: 'USER' | 'SUPER_ADMIN';
  gender?: string | null;
  avatar_url?: string | null;
}

export interface Post {
  public_id: string;
  title: string;
  body: string;
  upvotes_count: number;
  downvotes_count: number;
  score: number;
  comments_count: number;
  comments_locked: boolean;
  created_at: string;
  is_ghost?: boolean;
  author: {
    public_id: string;
    display_name: string;
    username: string;
    avatar_url?: string | null;
    is_ghost?: boolean;
  };
  organization?: {
    public_id: string;
    name: string;
    slug: string;
  } | null;
  user_vote?: number;
}

export interface Comment {
  public_id: string;
  body: string;
  depth: number;
  status: string;
  created_at: string;
  author: {
    public_id?: string;
    display_name: string;
    username: string;
    avatar_url?: string | null;
  };
  replies?: Comment[];
}

export interface Organization {
  public_id: string;
  name: string;
  slug: string;
}

export interface Notice {
  public_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

export interface SharedProps {
  site: SiteSettings;
  [key: string]: unknown;
  auth: {
    user: User | null;
  };
  flash: {
    success?: string;
    error?: string;
    recovery_code?: string;
  };
}

export interface SiteSettings {
  site_name: string; tagline: string; logo_text: string;
  primary_color: string; background_color: string; surface_color: string;
  corner_radius: number; font_family: 'system' | 'mono' | 'serif'; density: 'comfortable' | 'compact'; animations_enabled: boolean;
  homepage_layout: 'chat' | 'feed'; default_room_slug: string; homepage_title: string; homepage_description: string;
  welcome_message: string; announcement_enabled: boolean; announcement_text: string; footer_text: string;
  rules_text: string; privacy_text: string;
  registration_enabled: boolean; chat_enabled: boolean; guest_chat_enabled: boolean; member_rooms_enabled: boolean;
  anonymous_enabled: boolean; replies_enabled: boolean; posts_enabled: boolean; comments_enabled: boolean;
  message_max_length: number; message_rate_limit: number; guest_rate_limit: number; poll_interval: number;
  history_limit: number; guest_retention_minutes: number;
}

export interface ChatRoomSummary {
  public_id: string;
  name: string;
  slug: string;
  description: string | null;
  messages_count?: number;
  has_password?: boolean;
}

export interface ChatSender {
  public_id: string;
  display_name: string;
  username: string;
  is_ghost?: boolean;
  is_guest?: boolean;
  avatar_url?: string | null;
}

export interface ChatSubMessage {
  public_id: string;
  parent_public_id: string;
  message: string;
  created_at: string;
  is_ghost?: boolean;
  is_guest?: boolean;
  is_own?: boolean;
  sender: ChatSender;
}

export interface ChatMessageItem {
  public_id: string;
  message: string;
  created_at: string;
  is_ghost?: boolean;
  is_guest?: boolean;
  is_own?: boolean;
  sender: ChatSender;
  sub_chats?: ChatSubMessage[];
  sub_chats_count?: number;
  butterfly_count?: number;
  has_reacted_butterfly?: boolean;
}

