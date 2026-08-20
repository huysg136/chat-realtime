import { Image } from 'antd';

export default function ImageLightbox({
  open,
  sources = [],
  current = 0,
  onClose,
  onChange,
}) {
  const validSources = sources.filter(Boolean);
  if (!open || validSources.length === 0) return null;

  const safeCurrent = Math.min(Math.max(current, 0), validSources.length - 1);

  return (
    <div style={{ display: 'none' }} aria-hidden="true">
      <Image.PreviewGroup
        preview={{
          visible: open,
          current: safeCurrent,
          onVisibleChange: (visible) => {
            if (!visible) onClose?.();
          },
          onChange: (nextIndex) => onChange?.(nextIndex),
        }}
      >
        {validSources.map((source, index) => (
          <Image key={`${source}-${index}`} src={source} alt="" />
        ))}
      </Image.PreviewGroup>
    </div>
  );
}
