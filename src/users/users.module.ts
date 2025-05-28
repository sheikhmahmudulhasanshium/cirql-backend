import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe'; // Import the pipe

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    ParseObjectIdPipe, // Provide the pipe here
  ],
  exports: [UsersService], // Export UsersService if AuthModule needs it
})
export class UsersModule {}
