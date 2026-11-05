"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  accessToken?: string;
  updatedAt?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function ProfileAvatar({
  accessToken,
  updatedAt,
  name,
  className,
  fallbackClassName,
}: ProfileAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener("profile-picture-updated", refresh);
    return () => window.removeEventListener("profile-picture-updated", refresh);
  }, []);

  useEffect(() => {
    if (!accessToken || (!updatedAt && refreshKey === 0)) {
      return;
    }

    let isCurrent = true;
    let objectUrl: string | null = null;
    void apiClient.getProfilePicture(accessToken)
      .then((blob) => {
        if (!isCurrent) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (isCurrent) setImageUrl(null);
      });

    return () => {
      isCurrent = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessToken, updatedAt, refreshKey]);

  const canShowImage = Boolean(accessToken && (updatedAt || refreshKey > 0));
  const initial = name?.trim().charAt(0).toUpperCase() || "U";
  return (
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full", className)}>
      {canShowImage && imageUrl ? (
        <Image src={imageUrl} alt={`${name || "User"} profile picture`} fill unoptimized sizes="48px" className="object-cover" />
      ) : (
        <span aria-hidden="true" className={cn("flex h-full w-full items-center justify-center rounded-full", fallbackClassName)}>
          {initial}
        </span>
      )}
    </div>
  );
}
