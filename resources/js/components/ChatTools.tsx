import { RefreshCw, Search } from 'lucide-react';

interface Props {
  search: string; onSearch: (value: string) => void;
  autoScroll: boolean; onAutoScroll: (value: boolean) => void;
  onRefresh: () => void; connected: boolean;
}
export default function ChatTools({ search, onSearch, autoScroll, onAutoScroll, onRefresh, connected }: Props) {
  return <div className="chat-tools">
    <label className="chat-search"><Search size={15} /><input aria-label="Search loaded messages" value={search} onChange={event => onSearch(event.target.value)} placeholder="Search recent messages" type="search" /></label>
    <label className="chat-follow"><input type="checkbox" checked={autoScroll} onChange={event => onAutoScroll(event.target.checked)} />Follow new messages</label>
    <button type="button" className="icon-button" onClick={onRefresh} aria-label="Refresh messages" title={connected ? 'Refresh messages' : 'Reconnect'}><RefreshCw size={16} /></button>
  </div>;
}
