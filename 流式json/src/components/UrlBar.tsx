import { useEffect, useRef, useState } from "react";

interface Props {
  loading: boolean;
  onStart: (url: string) => void;
  onAbort: () => void;
  initialUrl?: string;
}

export function UrlBar({ loading, onStart, onAbort, initialUrl = "" }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (loading) {
      onAbort();
    } else {
      onStart(url);
    }
  };

  return (
    <div className="url-bar">
      <input
        ref={inputRef}
        className="url-input"
        type="text"
        spellCheck={false}
        placeholder="输入 JSON 链接，例如 https://example.com/data.json"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <button
        className={loading ? "btn btn-danger" : "btn btn-primary"}
        onClick={submit}
        disabled={!loading && !url.trim()}
      >
        {loading ? "取消" : "获取"}
      </button>
    </div>
  );
}
