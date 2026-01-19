import { loginLayout } from './layout.js';

export function renderLogin(error = '') {
  return loginLayout({
    title: 'Admin - Login',
    error,
    content: `
    <h1 class="m-0 mb-6 text-2xl text-center">Admin</h1>
    <form method="POST" action="/admin/login">
      <div class="mb-4">
        <label for="email" class="block mb-1.5 text-sm text-slate-400">Email</label>
        <input type="email" id="email" name="email" required autofocus
          class="w-full p-3 border border-slate-700 rounded-md bg-slate-950 text-slate-200 text-sm focus:outline-none focus:border-blue-500">
      </div>
      <div class="mb-4">
        <label for="password" class="block mb-1.5 text-sm text-slate-400">Password</label>
        <input type="password" id="password" name="password" required
          class="w-full p-3 border border-slate-700 rounded-md bg-slate-950 text-slate-200 text-sm focus:outline-none focus:border-blue-500">
      </div>
      <button type="submit" class="w-full p-3 bg-blue-500 border-0 rounded-md text-white text-sm font-semibold cursor-pointer mt-2 hover:bg-blue-600">Login</button>
    </form>
    <p class="text-xs text-slate-500 text-center mt-4">Admin access required</p>
    `,
  });
}
