import { UserRepository } from "./user.repository.js";
import { CreateUserInput } from "./user.validation.js";

const userRepo = new UserRepository();


export class UserService {
  // create user service
  async createUser(data: CreateUserInput) {
    const user = await userRepo.createUser(data);
    console.log(user , 'from service');
    return user;
  }
}
