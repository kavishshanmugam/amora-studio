import { useState } from "react";
import { Image, Link2, Plus, Trash2, ExternalLink, Star } from "lucide-react";
import { useImages, useCreateImage, useUpdateImage, useDeleteImage } from "../../hooks/use-images";
import { useVisionLinks, useCreateVisionLink, useDeleteVisionLink } from "../../hooks/use-vision-links";
import { pickImages } from "../../utils/pick-image";
import type { AmoraEvent } from "../../data";

export function MoodboardTab({ event }: { event: AmoraEvent }) {
  const { data: images = [] } = useImages(event.id, "moodboard");
  const { data: links = [] } = useVisionLinks(event.id);

  // Palette from event
  const swatches = event.palette ? event.palette.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-4">
      {/* Palette swatches */}
      {swatches.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Palette</span>
          <div className="flex gap-2">
            {swatches.map((hex) => (
              <div
                key={hex}
                className="w-8 h-8 rounded-lg border border-border shadow-sm"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>
      )}

      {/* Images section */}
      <ImageGrid eventId={event.id} images={images} />

      {/* Links section */}
      <LinksSection eventId={event.id} links={links} />
    </div>
  );
}

// --- Image Grid ---

function ImageGrid({ eventId, images }: { eventId: string; images: ReturnType<typeof useImages>["data"] & {} }) {
  const createImage = useCreateImage();
  const updateImage = useUpdateImage();
  const deleteImage = useDeleteImage();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const handleAdd = async () => {
    const picked = await pickImages(true);
    for (let i = 0; i < picked.length; i++) {
      createImage.mutate({
        event_id: eventId,
        kind: "moodboard",
        file_name: picked[i].name,
        caption: null,
        source_url: picked[i].dataUrl,
        is_favourite: 0,
        width: null,
        height: null,
        position: images.length + i,
      });
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium flex items-center gap-2">
          <Image size={14} /> Inspiration images
        </h4>
        <button
          onClick={handleAdd}
          className="text-xs text-brand hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> Add image
        </button>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              <div
                className="aspect-square rounded-lg bg-bg border border-border overflow-hidden cursor-pointer hover:border-brand transition-colors"
                onClick={() => setLightbox(img.id)}
              >
                {img.source_url ? (
                  <img src={img.source_url} alt={img.file_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Image size={24} className="mx-auto text-text-secondary/30" />
                      <p className="text-[10px] text-text-secondary mt-1 truncate max-w-[100px] mx-auto">
                        {img.file_name}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Overlay actions */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => updateImage.mutate({ id: img.id, eventId, data: { is_favourite: img.is_favourite ? 0 : 1 } })}
                  className={`p-1 rounded ${img.is_favourite ? "text-need" : "text-white/70 hover:text-white"} bg-black/40`}
                >
                  <Star size={12} fill={img.is_favourite ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => deleteImage.mutate({ id: img.id, eventId })}
                  className="p-1 rounded text-white/70 hover:text-danger bg-black/40"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Caption */}
              {img.caption && (
                <p className="text-[10px] text-text-secondary mt-1 truncate">{img.caption}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary text-center py-6">
          No inspiration yet. Add images or save a Pinterest board link.
        </p>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <div className="bg-surface rounded-xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const img = images.find((i) => i.id === lightbox);
              if (!img) return null;
              return (
                <div className="space-y-3">
                  <div className="aspect-video bg-bg rounded-lg flex items-center justify-center overflow-hidden">
                    {img.source_url ? (
                      <img src={img.source_url} alt={img.file_name} className="w-full h-full object-contain" />
                    ) : (
                      <Image size={48} className="text-text-secondary/20" />
                    )}
                  </div>
                  <input
                    value={img.caption ?? ""}
                    onChange={(e) => updateImage.mutate({ id: img.id, eventId, data: { caption: e.target.value } })}
                    placeholder="Add a caption..."
                    className="w-full text-sm bg-transparent border-b border-border outline-none py-1"
                  />
                  <p className="text-xs text-text-secondary">{img.file_name}</p>
                  <button
                    onClick={() => setLightbox(null)}
                    className="text-xs text-brand hover:underline"
                  >
                    Close
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Links Section ---

function LinksSection({ eventId, links }: { eventId: string; links: ReturnType<typeof useVisionLinks>["data"] & {} }) {
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const createLink = useCreateVisionLink();
  const deleteLink = useDeleteVisionLink();

  const detectKind = (u: string): string => {
    if (u.includes("pinterest")) return "pinterest";
    if (u.includes("instagram")) return "instagram";
    return "website";
  };

  const kindIcon = (kind: string | null) => {
    if (kind === "pinterest") return "P";
    if (kind === "instagram") return "IG";
    return "W";
  };

  const handleAdd = () => {
    if (!url.trim()) return;
    createLink.mutate({
      event_id: eventId,
      url: url.trim(),
      title: title.trim() || null,
      note: note.trim() || null,
      kind: detectKind(url),
      position: links.length,
    });
    setUrl("");
    setTitle("");
    setNote("");
    setShowAdd(false);
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium flex items-center gap-2">
          <Link2 size={14} /> Links
        </h4>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-brand hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> Add link
        </button>
      </div>

      {showAdd && (
        <div className="mb-3 p-3 rounded-lg bg-bg space-y-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full text-sm bg-transparent border-b border-border outline-none py-1"
            autoFocus
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full text-sm bg-transparent border-b border-border outline-none py-1"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full text-sm bg-transparent border-b border-border outline-none py-1"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="text-xs bg-brand text-white px-3 py-1 rounded">
              Save
            </button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-text-secondary hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {links.length > 0 ? (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-bg/50 group">
              <span className="w-7 h-7 rounded bg-bg flex items-center justify-center text-[10px] font-bold text-text-secondary shrink-0">
                {kindIcon(link.kind)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{link.title || link.url}</p>
                {link.note && <p className="text-xs text-text-secondary truncate">{link.note}</p>}
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-text-secondary hover:text-brand"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => deleteLink.mutate({ id: link.id, eventId })}
                className="p-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        !showAdd && (
          <p className="text-sm text-text-secondary text-center py-2">
            No links saved yet.
          </p>
        )
      )}
    </div>
  );
}
