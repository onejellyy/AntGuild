// ─────────────────────────────────────────────────────────────
// 아바타 이미지 레지스트리
//
// 사용 방법:
//   1. 이미지 파일을  assets/avatars/  폴더에 넣는다
//   2. 아래 AVATARS 배열에 항목을 추가한다
//
// 예시:
//   { id: 'avatar_01', source: require('../../assets/avatars/avatar_01.png') },
// ─────────────────────────────────────────────────────────────

export interface AvatarDef {
  id: string;
  source: ReturnType<typeof require>;
}

export const AVATARS: AvatarDef[] = [
  // ↓ 여기에 추가하세요
];

/** id 로 AvatarDef 조회 */
export function getAvatar(id: string | null | undefined): AvatarDef | null {
  if (!id) return null;
  return AVATARS.find(a => a.id === id) ?? null;
}
