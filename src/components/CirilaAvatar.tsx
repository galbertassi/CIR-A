'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

type CirilaExpression = 'neutral' | 'smiling' | 'thinking' | 'alert';

interface CirilaAvatarProps {
  expression?: CirilaExpression;
  size?: number | string;
  showAura?: boolean;
  className?: string;
}

export default function CirilaAvatar({
  expression = 'neutral',
  size = '100%',
  showAura = false,
  className = ''
}: CirilaAvatarProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Mapeamento de expressões para os arquivos 3D correspondentes
  const expressionImages: Record<CirilaExpression, string> = {
    neutral: '/cirila_3D_neutral.png',
    smiling: '/cirila_3D_smiling.png',
    thinking: '/cirila_3D_thinking.png',
    alert: '/cirila_3D_alert.png'
  };

  const currentImage = expressionImages[expression] || expressionImages.neutral;

  // Cores de status sutis para o efeito de aura/brilho
  const statusColors: Record<CirilaExpression, string> = {
    neutral: 'rgba(0, 216, 255, 0.2)',
    smiling: 'rgba(16, 185, 129, 0.3)',
    thinking: 'rgba(14, 165, 233, 0.3)',
    alert: 'rgba(239, 68, 68, 0.3)'
  };

  return (
    <div className={`cirila-avatar-container ${className}`} style={{
      position: 'relative',
      width: size,
      height: 'auto',
      aspectRatio: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Aura de fundo dinâmica */}
      <div style={{
        position: 'absolute',
        width: '120%',
        height: '120%',
        background: `radial-gradient(circle, ${statusColors[expression]} 0%, transparent 70%)`,
        borderRadius: '50%',
        zIndex: 0,
        filter: 'blur(20px)',
        opacity: 0.8,
        animation: 'pulse-aura 4s infinite alternate'
      }} />

      <Image
        src={currentImage}
        alt={`Cirila ${expression}`}
        width={512}
        height={512}
        priority
        className={className}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          zIndex: 1,
          filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.3))'
        }}
      />

      <style jsx>{`
        .cirila-avatar-container {
          user-select: none;
          pointer-events: none;
        }
        @keyframes pulse-aura {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

