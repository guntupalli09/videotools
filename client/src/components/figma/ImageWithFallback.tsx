import { useState } from 'react';

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false);
  const { src, alt, style, className, width, height, ...rest } = props;

  if (didError) {
    const fallbackStyle: React.CSSProperties = {
      ...style,
      background: 'var(--gray-100, #f3f4f6)',
      minHeight: 80,
    };
    if (width != null && height != null) {
      if (typeof width === 'number' && typeof height === 'number') {
        fallbackStyle.width = width;
        fallbackStyle.height = height;
      } else {
        fallbackStyle.aspectRatio = `${width} / ${height}`;
      }
    }
    return (
      <div className={className ?? ''} style={fallbackStyle}>
        <span className="sr-only">Image unavailable</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt ?? ''}
      className={className}
      style={style}
      width={width}
      height={height}
      {...rest}
      onError={() => setDidError(true)}
    />
  );
}
