import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';
import {Platform} from 'react-native';
import type {PendingMeal} from './AutoAdjustStorage';

const CHANNEL_ID = 'glucose-follow-up';

export async function scheduleMealReminder(
  meal: PendingMeal,
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    const permission = await notifee.requestPermission();
    if (permission.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
      return false;
    }
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Glucosa después de comer',
      importance: AndroidImportance.DEFAULT,
    });
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: meal.dueAt,
    };
    await notifee.createTriggerNotification(
      {
        id: meal.id,
        title: 'Introduce tu glucosa actual',
        body: 'Han pasado unos 90 minutos desde el comienzo de la comida.',
        data: {mealId: meal.id},
        android: {channelId: CHANNEL_ID, pressAction: {id: 'default'}},
      },
      trigger,
    );
    return true;
  } catch (_) {
    // The reading remains available in the app if Android cannot schedule an alarm.
    return false;
  }
}

export async function cancelMealReminder(mealId: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await notifee.cancelTriggerNotification(mealId);
  await notifee.cancelNotification(mealId);
}

export async function cancelMealReminders(meals: PendingMeal[]): Promise<void> {
  await Promise.all(meals.map(meal => cancelMealReminder(meal.id)));
}

export async function initialReminderMealId(): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  const opened = await notifee.getInitialNotification();
  const mealId = opened?.notification.data?.mealId;
  return typeof mealId === 'string' ? mealId : null;
}

export function subscribeReminderPress(
  onPress: (mealId: string) => void,
): () => void {
  if (Platform.OS !== 'android') {
    return () => {};
  }
  return notifee.onForegroundEvent(({type, detail}) => {
    if (type !== EventType.PRESS) {
      return;
    }
    const mealId = detail.notification?.data?.mealId;
    if (typeof mealId === 'string') {
      onPress(mealId);
    }
  });
}
