import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class HealthProfile extends Model {
  static table = 'health_profiles';

  @field('user_id') userId: any;
  @field('date_of_birth') dateOfBirth: any;
  @field('gender') gender: any;
  @field('blood_type') bloodType: any;
  @field('height') height: any;
  @field('weight') weight: any;
  @field('dietary_preferences') dietaryPreferences: any;
  @field('health_goals') healthGoals: any;

  @readonly @date('created_at') createdAt: any;
  @readonly @date('updated_at') updatedAt: any;
}
