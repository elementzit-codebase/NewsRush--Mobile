import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { SERVER_ORIGIN } from '../constants/api';
import { User } from '../types';

interface Props {
  user?: User | null;
  size?: number;
  fontSize?: number;
  borderColor?: string;
  borderWidth?: number;
}

export function resolveAvatarUrl(rawPath?: string | null): string | null {
  if (!rawPath) return null;
  if (
    rawPath.startsWith('http://') ||
    rawPath.startsWith('https://') ||
    rawPath.startsWith('data:') ||
    rawPath.startsWith('file:')
  ) {
    return rawPath;
  }
  const cleanOrigin = SERVER_ORIGIN.replace(/\/+$/, '');
  const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  return `${cleanOrigin}${cleanPath}`;
}

export default function Avatar({
  user,
  size = 38,
  fontSize = 14,
  borderColor = 'transparent',
  borderWidth = 0,
}: Props) {
  const [imgError, setImgError] = useState(false);

  const rawPic = user?.profile_pic || user?.profilePhoto || null;
  const picUrl = resolveAvatarUrl(rawPic);

  useEffect(() => {
    setImgError(false);
  }, [rawPic]);

  const initials = (
    `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.trim() ||
    user?.name?.slice(0, 2) ||
    user?.email?.[0] ||
    'U'
  ).toUpperCase();

  const radius = size / 2;

  if (picUrl && !imgError) {
    return (
      <Image
        source={{ uri: picUrl }}
        onError={() => setImgError(true)}
        style={[
          styles.img,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor,
            borderWidth,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderColor,
          borderWidth,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: Colors.navy50,
  },
  fallback: {
    backgroundColor: Colors.navy900,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

