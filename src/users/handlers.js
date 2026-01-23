import { updateUserName } from './repository.js';

export async function updateName(request, reply) {
  const { name } = request.body;
  const userId = request.user.id;

  if (!name) {
    return reply.code(400).send({ error: 'Name is required' });
  }

  const user = await updateUserName(userId, name);

  if (!user) {
    return reply.code(404).send({ error: 'User not found' });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
