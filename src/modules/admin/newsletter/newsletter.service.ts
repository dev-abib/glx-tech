import { getPrismaClient } from "../../../config/database.js";
import { NewsLetterInput } from "./newsletter.validation.js";

const prisma = getPrismaClient();

export class NewsLetterService {
  // news letter subscription system
  async subscribeUnsubscribeNewsLetter(
    data: NewsLetterInput
  ): Promise<{ message: string }> {
    const isExists = await prisma.emailSubscribe.findUnique({
      where: { email: data.email },
    });

    if (isExists) {
      await prisma.emailSubscribe.delete({
        where: { email: data.email },
      });

      return {
        message: `successfully unsubscribed newsletter.`,
      };
    } else {
      await prisma.emailSubscribe.create({
        data: {
          email: data.email,
        },
      });
      return {
        message: `successfully subscribed newsletter.`,
      };
    }
  }
}
