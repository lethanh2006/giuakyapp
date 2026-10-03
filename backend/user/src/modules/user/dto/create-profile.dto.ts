import { IsEmail, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateProfileDto {
  @IsMongoId({ message: 'userId must be a valid MongoDB ObjectId' })
  userId!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;
}
