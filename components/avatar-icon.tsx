import Image from "next/image";
import type { AgeGroup, Gender } from "@/types";

interface AvatarIconProps {
  gender: Gender;
  ageGroup: AgeGroup;
  size?: number;
  className?: string;
}

function getAvatarSrc(gender: Gender, ageGroup: AgeGroup): string {
  const isChild = ageGroup === "kid" || ageGroup === "toddler" || ageGroup === "infant";
  const isTeen = ageGroup === "teen";

  if (gender === "female") {
    if (isChild) return "/avatars/kid-girl.svg";
    if (isTeen) return "/avatars/teen-girl.svg";
    return "/avatars/adult-woman.svg";
  }
  if (isChild) return "/avatars/kid-boy.svg";
  if (isTeen) return "/avatars/teen-boy.svg";
  return "/avatars/adult-man.svg";
}

export function AvatarIcon({ gender, ageGroup, size = 40, className }: AvatarIconProps) {
  return (
    <Image
      src={getAvatarSrc(gender, ageGroup)}
      alt={`${gender} ${ageGroup}`}
      width={size}
      height={size}
      className={className}
    />
  );
}
