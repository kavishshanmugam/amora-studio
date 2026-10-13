import { useState } from "react";
import { Camera, Star, Trash2, Plus, Instagram, Copy, Hash, Check, ExternalLink, Image } from "lucide-react";
import { useImages, useCreateImage, useUpdateImage, useDeleteImage } from "../../hooks/use-images";
import { useInstagramPost, useCreateInstagramPost, useUpdateInstagramPost } from "../../hooks/use-instagram-post";
import type { AmoraEvent } from "../../data";
import { useQuery } from "@tanstack/react-query";

export function PhotosTab({ event }: { event: AmoraEvent }) {
  return (
    <div className="space-y-4">
      <SetupPhotos event={event} />
      <InstagramPlanner event={event} />
    </div>
  );
}

// --- Setup Photos ---

function SetupPhotos({ event }: { event: AmoraEvent }) {
  const { data: photos = [] } = useImages(event.id, "photo");
  const createImage = useCreateImage();
  const updateImage = useUpdateImage();
  const deleteImage = useDeleteImage();

  const handleAdd = () => {
    // ponytail: Tauri dialog.open() for file picking in real app
    const name = `photo-${Date.now()}.jpg`;
    createImage.mutate({
      event_id: event.id,
      kind: "photo",
      file_name: name,
      caption: null,
      source_url: null,
      is_favourite: 0,
      width: null,
      height: null,
      position: photos.length,
    });
  };

  const favCount = photos.filter((p) => p.is_favourite).length;

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium flex items-center gap-2">
          <Camera size={14} /> Setup photos
        </h4>
        <div className="flex items-center gap-3">
          {favCount > 0 && (
            <span className="text-xs text-text-secondary">
              <Star size={10} className="inline text-need" fill="currentColor" /> {favCount} favourites
            </span>
          )}
          <button onClick={handleAdd} className="text-xs text-brand hover:underline flex items-center gap-1">
            <Plus size={12} /> Add photos
          </button>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative">
              <div className="aspect-square rounded-lg bg-bg border border-border flex items-center justify-center">
                <div className="text-center">
                  <Image size={20} className="mx-auto text-text-secondary/30" />
                  <p className="text-[9px] text-text-secondary mt-1 truncate max-w-[80px] mx-auto">
                    {photo.file_name}
                  </p>
                </div>
              </div>
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => updateImage.mutate({ id: photo.id, eventId: event.id, data: { is_favourite: photo.is_favourite ? 0 : 1 } })}
                  className={`p-1 rounded ${photo.is_favourite ? "text-need" : "text-white/70"} bg-black/40`}
                >
                  <Star size={10} fill={photo.is_favourite ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => deleteImage.mutate({ id: photo.id, eventId: event.id })}
                  className="p-1 rounded text-white/70 hover:text-danger bg-black/40"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary text-center py-6">
          No setup photos yet. Add photos after the event.
        </p>
      )}
    </div>
  );
}

// --- Instagram Planner ---

function InstagramPlanner({ event }: { event: AmoraEvent }) {
  const { data: post } = useInstagramPost(event.id);
  const createPost = useCreateInstagramPost();
  const updatePost = useUpdateInstagramPost();
  const { data: photos = [] } = useImages(event.id, "photo");
  const [copied, setCopied] = useState(false);

  // Load hashtag sets from settings
  const { data: hashtagSets = [] } = useQuery({
    queryKey: ["hashtag-sets"],
    queryFn: async () => {
      const { getDb } = await import("../../data");
      const db = await getDb();
      return db.select<{ id: string; name: string; tags: string }[]>(
        "SELECT * FROM hashtag_sets ORDER BY name"
      );
    },
  });

  if (!post) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium flex items-center gap-2">
            <Instagram size={14} /> Instagram post
          </h4>
          <button
            onClick={() => createPost.mutate({
              event_id: event.id,
              status: "not_started",
              caption: null,
              hashtags: null,
              image_ids: null,
              posted_date: null,
              post_url: null,
            })}
            className="text-xs text-brand hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Start planning
          </button>
        </div>
      </div>
    );
  }

  const statusLabel = { not_started: "Not started", draft: "Draft", posted: "Posted" }[post.status] ?? post.status;
  const statusColor = { not_started: "bg-bg text-text-secondary", draft: "bg-need/10 text-need", posted: "bg-success/10 text-success" }[post.status] ?? "";

  const selectedIds: string[] = post.image_ids ? JSON.parse(post.image_ids) : [];

  const handleCopyCaption = async () => {
    const fullCaption = [post.caption, post.hashtags].filter(Boolean).join("\n\n");
    if (fullCaption) {
      await navigator.clipboard.writeText(fullCaption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInsertCredits = () => {
    updatePost.mutate({
      id: post.id,
      eventId: event.id,
      data: { caption: (post.caption ?? "") + "\n\nCredits: (edit with @handles)" },
    });
  };

  const handleMarkPosted = () => {
    const url = prompt("Post URL (optional):");
    updatePost.mutate({
      id: post.id,
      eventId: event.id,
      data: {
        status: "posted",
        posted_date: new Date().toISOString().slice(0, 10),
        post_url: url || null,
      },
    });
  };

  const togglePhoto = (photoId: string) => {
    const current = new Set(selectedIds);
    if (current.has(photoId)) current.delete(photoId);
    else current.add(photoId);
    updatePost.mutate({
      id: post.id,
      eventId: event.id,
      data: { image_ids: JSON.stringify([...current]) },
    });
  };

  const addHashtagSet = (tags: string) => {
    const current = post.hashtags ?? "";
    const combined = current ? current + " " + tags : tags;
    updatePost.mutate({
      id: post.id,
      eventId: event.id,
      data: { hashtags: combined },
    });
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium flex items-center gap-2">
          <Instagram size={14} /> Instagram post
        </h4>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Photo picker */}
      {photos.length > 0 && (
        <div>
          <p className="text-xs text-text-secondary mb-2">Pick photos ({selectedIds.length}/20)</p>
          <div className="flex gap-2 flex-wrap">
            {photos.map((photo) => {
              const selected = selectedIds.includes(photo.id);
              return (
                <button
                  key={photo.id}
                  onClick={() => togglePhoto(photo.id)}
                  className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center text-xs transition-colors ${
                    selected ? "border-brand bg-brand/10" : "border-border bg-bg hover:border-brand/50"
                  }`}
                >
                  {selected ? (
                    <span className="text-brand font-bold">{selectedIds.indexOf(photo.id) + 1}</span>
                  ) : (
                    <Image size={16} className="text-text-secondary/30" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Caption */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-text-secondary">Caption</p>
          <span className="text-[10px] text-text-secondary">
            {(post.caption ?? "").length}/2,200
          </span>
        </div>
        <textarea
          value={post.caption ?? ""}
          onChange={(e) => updatePost.mutate({ id: post.id, eventId: event.id, data: { caption: e.target.value } })}
          placeholder="Write your caption..."
          rows={4}
          className="w-full text-sm bg-bg border border-border rounded-lg p-3 outline-none resize-none focus:border-brand"
          maxLength={2200}
        />
        <div className="flex gap-2 mt-1">
          <button
            onClick={handleInsertCredits}
            className="text-xs text-brand hover:underline"
          >
            Insert credits
          </button>
        </div>
      </div>

      {/* Hashtags */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs text-text-secondary">Hashtags</p>
          {hashtagSets.length > 0 && (
            <div className="flex gap-1">
              {hashtagSets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => addHashtagSet(set.tags)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border hover:border-brand text-text-secondary"
                >
                  <Hash size={8} className="inline" /> {set.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <textarea
          value={post.hashtags ?? ""}
          onChange={(e) => updatePost.mutate({ id: post.id, eventId: event.id, data: { hashtags: e.target.value } })}
          placeholder="#amoraevents #melbourneevents..."
          rows={2}
          className="w-full text-sm bg-bg border border-border rounded-lg p-3 outline-none resize-none focus:border-brand"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCopyCaption}
          className="flex items-center gap-1.5 text-sm bg-text-primary text-white px-4 py-2 rounded-lg hover:bg-brand transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy caption"}
        </button>

        {post.status !== "posted" && (
          <>
            <button
              onClick={() => updatePost.mutate({ id: post.id, eventId: event.id, data: { status: "draft" } })}
              className="flex items-center gap-1.5 text-sm border border-border px-4 py-2 rounded-lg hover:bg-bg transition-colors"
              disabled={post.status === "draft"}
            >
              Save as draft
            </button>
            <button
              onClick={handleMarkPosted}
              className="flex items-center gap-1.5 text-sm bg-success text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Check size={14} /> Mark as posted
            </button>
          </>
        )}

        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm border border-border px-4 py-2 rounded-lg hover:bg-bg transition-colors"
          >
            <ExternalLink size={14} /> View post
          </a>
        )}
      </div>

      {post.posted_date && (
        <p className="text-xs text-text-secondary">
          Posted on {post.posted_date}
        </p>
      )}
    </div>
  );
}