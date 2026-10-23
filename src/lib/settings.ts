import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 고를 수 있는 알림음.
 *
 * channelId가 소리마다 따로 있는 이유: 안드로이드는 알림 채널을 한 번 만들면
 * 소리를 코드로 바꿀 수 없다. 소리를 바꾸려면 채널을 새로 만들어야 하므로
 * 소리 하나가 채널 하나다. 파일은 app.json의 expo-notifications sounds에
 * 등록되어 있어야 안드로이드가 찾을 수 있다.
 */
export type AlarmSoundKey = 'alarm' | 'bell' | 'urgent' | 'drop';

export type AlarmSound = {
  key: AlarmSoundKey;
  label: string;
  /** 어떤 때 고르면 좋은지. 들어보지 않고도 짐작할 수 있게 적는다. */
  description: string;
  /** 번들에 들어간 파일 이름. */
  file: string;
  channelId: string;
};

/** 기본 소리는 지금까지 쓰던 채널을 그대로 쓴다(이미 쓰던 사람의 채널 설정을 지키려고). */
export const DEFAULT_SOUND_KEY: AlarmSoundKey = 'alarm';

export const ALARM_SOUNDS: readonly AlarmSound[] = [
  {
    key: 'alarm',
    label: '기본 알람',
    description: '또렷한 두 음이 반복됩니다',
    file: 'alarm.wav',
    channelId: 'dose-alarms-v2',
  },
  {
    key: 'bell',
    label: '종소리',
    description: '부드럽지만 멀리까지 들립니다',
    file: 'bell.wav',
    channelId: 'dose-alarms-v2-bell',
  },
  {
    key: 'urgent',
    label: '사이렌',
    description: '가장 강하게 깨웁니다',
    file: 'urgent.wav',
    channelId: 'dose-alarms-v2-urgent',
  },
  {
    key: 'drop',
    label: '물방울',
    description: '가장 조용한 선택입니다',
    file: 'drop.wav',
    channelId: 'dose-alarms-v2-drop',
  },
];

export function soundFor(key: AlarmSoundKey): AlarmSound {
  return ALARM_SOUNDS.find((sound) => sound.key === key) ?? ALARM_SOUNDS[0];
}

/** 다시 알림 간격. 0은 끔. */
export const REPEAT_CHOICES = [0, 5, 10, 20] as const;
export type RepeatMinutes = (typeof REPEAT_CHOICES)[number];

/** 체크하지 않았을 때 한 번 더 울리는 간격. 기본값은 10분. */
export const DEFAULT_REPEAT_MINUTES: RepeatMinutes = 10;

export type Settings = {
  soundKey: AlarmSoundKey;
  repeatAfterMinutes: RepeatMinutes;
};

export const DEFAULT_SETTINGS: Settings = {
  soundKey: DEFAULT_SOUND_KEY,
  repeatAfterMinutes: DEFAULT_REPEAT_MINUTES,
};

const KEY = 'medi.settings.v1';

function isSoundKey(value: unknown): value is AlarmSoundKey {
  return ALARM_SOUNDS.some((sound) => sound.key === value);
}

function isRepeatMinutes(value: unknown): value is RepeatMinutes {
  return REPEAT_CHOICES.some((minutes) => minutes === value);
}

export async function getSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS;
    const value = parsed as Record<string, unknown>;
    return {
      soundKey: isSoundKey(value.soundKey) ? value.soundKey : DEFAULT_SETTINGS.soundKey,
      repeatAfterMinutes: isRepeatMinutes(value.repeatAfterMinutes)
        ? value.repeatAfterMinutes
        : DEFAULT_SETTINGS.repeatAfterMinutes,
    };
  } catch {
    // 저장된 내용이 깨졌더라도 알림은 기본값으로 계속 울려야 한다.
    return DEFAULT_SETTINGS;
  }
}

async function patch(changes: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...changes };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function setSoundKey(soundKey: AlarmSoundKey): Promise<Settings> {
  return patch({ soundKey });
}

export function setRepeatAfterMinutes(repeatAfterMinutes: RepeatMinutes): Promise<Settings> {
  return patch({ repeatAfterMinutes });
}
