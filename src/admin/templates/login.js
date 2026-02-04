import { loginLayout } from './layout.js';

export function renderLogin(error = '') {
  return loginLayout({
    title: 'Admin Login',
    error,
    content: `
    <div class="text-center mb-6">
      <h1 class="m-0 text-2xl"><span class="text-white">Pitch</span><span class="text-brand-gold">Highway</span></h1>
      <p class="text-slate-500 text-sm mt-1">Admin Portal</p>
    </div>
    <form method="POST" action="/admin/login">
      <div class="mb-4">
        <label for="email" class="block mb-1.5 text-sm text-slate-400">Email</label>
        <input type="email" id="email" name="email" required autofocus
          class="w-full p-3 border border-brand-elevated rounded-md bg-brand-bg text-slate-200 text-sm focus:outline-none focus:border-brand-gold transition-colors">
      </div>
      <div class="mb-4">
        <label for="password" class="block mb-1.5 text-sm text-slate-400">Password</label>
        <input type="password" id="password" name="password" required
          class="w-full p-3 border border-brand-elevated rounded-md bg-brand-bg text-slate-200 text-sm focus:outline-none focus:border-brand-gold transition-colors">
      </div>
      <button type="submit" class="w-full p-3 bg-brand-gold border-0 rounded-md text-slate-950 text-sm font-semibold cursor-pointer mt-2 hover:bg-brand-gold-hover transition-colors">Login</button>
    </form>
    <p class="text-xs text-slate-500 text-center mt-4">Admin access required</p>
    `,
  });
}
