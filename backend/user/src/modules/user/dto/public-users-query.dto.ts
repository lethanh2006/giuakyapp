import { ArrayMaxSize, ArrayUnique, IsArray, IsMongoId } from 'class-validator';

export class PublicUsersQueryDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsMongoId({ each: true })
  ids!: string[];
}
