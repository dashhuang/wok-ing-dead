// Pictures a texture no longer needs once it is on the GPU.
//
// three.js keeps every texture's picture (the decoded image, the bitmap from a GLB, the canvas)
// after uploading it, in case it is uploaded again. Nothing in the game uploads these again,
// and on a phone the copies cost a few hundred megabytes of the page's own memory: an iPhone
// counts that and the GPU memory together against one limit (about 2 GB on an iPhone Air) and
// kills the page when it is crossed. So on handheld devices the picture is let go as soon as
// it has been uploaded.
//
// Decoded pictures (an ImageBitmap, an <img>) are never drawn into, so they always go. A canvas
// goes only when whoever painted it says it is finished (markStatic): canvases that are drawn
// on during play (decals, screens) keep theirs.
//
// Should a released texture be uploaded again anyway, it is given a 1×1 canvas: at the size it
// already has on the GPU that replaces one pixel, so the picture stays as it was.
//
// game.js calls afterUpload() from three.js's upload of a 2D texture (next to onUpdate).
//
// The one time everything is uploaded again is when the browser takes the WebGL context away
// and gives it back (iOS does this to a page under memory pressure, for instance with another
// heavy tab open). three.js then re-uploads every texture from its picture, and the released
// ones come back as a single black pixel: the street goes dark and the signs disappear. With
// releasing on, a restored context therefore reloads the page. (Before releasing, a restored
// context already came back with a dark street and weapon: nothing else rebuilds the shadow
// caches, probes and render targets either.)

let on = false;
let spent = null;
let warned = false;
let reloading = false;

/** Turns releasing on or off (on for handheld devices; see game.js). */
export function releaseTextureImages(value) {
  on = !!value && typeof document !== "undefined";
  if (on && !spent) {
    spent = document.createElement("canvas");
    spent.width = spent.height = 1;
  }
  if (on && !reloading) {
    const view = document.getElementById("view");
    if (view) {
      reloading = true;
      view.addEventListener("webglcontextrestored", () => {
        console.warn("[texmem] WebGL context restored: reloading the page");
        location.reload();
      });
    }
  }
}

/** A canvas texture whose painting is finished: its canvas may go once it is uploaded. */
export function markStatic(tex) {
  if (tex && tex.isTexture) tex.userData.staticImage = true;
  return tex;
}

export function afterUpload(tex) {
  if (!on) return;
  const source = tex.source;
  const img = source && source.data;
  if (!img) return;
  if (img === spent) {
    // a released picture uploaded into a new GPU texture: that one is a single pixel
    if (!warned) {
      warned = true;
      console.warn("[texmem] a released texture was uploaded again:", tex.name);
    }
    return;
  }
  if (
    tex.isRenderTargetTexture ||
    tex.isDataTexture ||
    tex.isVideoTexture ||
    tex.isCubeTexture ||
    tex.isCompressedTexture ||
    tex.userData.keepImage
  )
    return;
  const bitmap =
    typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap;
  const picture =
    typeof HTMLImageElement !== "undefined" && img instanceof HTMLImageElement;
  const canvas =
    typeof HTMLCanvasElement !== "undefined" &&
    img instanceof HTMLCanvasElement &&
    tex.userData.staticImage;
  if (!bitmap && !picture && !canvas) return;
  source.data = spent;
  if (bitmap) img.close();
  else if (canvas) img.width = img.height = 0;
}
