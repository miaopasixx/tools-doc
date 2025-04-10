import project from 'virtual:starlight/project-context';
import { getRouteDataTestContext } from '../test-utils';
import config from 'virtual:starlight/user-config';
import { assert, expect, test, vi } from 'vitest';
import { routes } from '../../utils/routing';
import { generateRouteData } from '../../utils/routing/data';
import * as git from 'virtual:starlight/git-info';

vi.mock('astro:content', async () =>
	(await import('../test-utils')).mockedAstroContent({
		docs: [
			['404.md', { title: 'Page introuvable' }],
			['index.mdx', { title: 'Accueil' }],
			['en/index.mdx', { title: 'Home page' }],
			['ar/index.mdx', { title: 'الصفحة الرئيسية' }],
			[
				'guides/authoring-content.mdx',
				{ title: 'Création de contenu en Markdown', lastUpdated: true },
			],
		],
	})
);

test('test suite is using correct env', () => {
	expect(config.title).toMatchObject({ fr: 'i18n with root locale' });
});

test('routes includes fallback entries for untranslated pages', () => {
	const numLocales = config.isMultilingual ? Object.keys(config.locales).length : 1;
	const guides = routes.filter((route) => route.id.includes('guides/'));
	expect(guides).toHaveLength(numLocales);
});

test('routes have locale data added', () => {
	for (const { id, lang, dir, locale } of routes) {
		if (id.startsWith('en')) {
			expect(lang).toBe('en-US');
			expect(dir).toBe('ltr');
			expect(locale).toBe('en');
		} else if (id.startsWith('ar')) {
			expect(lang).toBe('ar');
			expect(dir).toBe('rtl');
			expect(locale).toBe('ar');
		} else {
			expect(lang).toBe('fr');
			expect(dir).toBe('ltr');
			expect(locale).toBeUndefined();
		}
	}
});

test('fallback routes have fallback locale data in entryMeta', () => {
	const fallbacks = routes.filter((route) => route.isFallback);
	expect(fallbacks.length).toBeGreaterThan(0);
	for (const route of fallbacks) {
		expect(route.entryMeta.locale).toBeUndefined();
		expect(route.entryMeta.locale).not.toBe(route.locale);
		expect(route.entryMeta.lang).toBe('fr');
		expect(route.entryMeta.lang).not.toBe(route.lang);
	}
});

test('fallback routes use their own locale data', () => {
	const enGuide = routes.find(
		(route) =>
			route.id ===
			(project.legacyCollections
				? 'en/guides/authoring-content.mdx'
				: 'en/guides/authoring-content')
	);
	if (!enGuide)
		throw new Error('Expected to find English fallback route for authoring-content.mdx');
	expect(enGuide.locale).toBe('en');
	expect(enGuide.lang).toBe('en-US');
});

test('fallback routes use fallback entry last updated dates', () => {
	const getNewestCommitDate = vi.spyOn(git, 'getNewestCommitDate');
	const route = routes.find((route) => route.entry.id === routes[4]!.id && route.locale === 'en');
	assert(route, 'Expected to find English fallback route for `guides/authoring-content.mdx`.');

	generateRouteData({
		props: {
			...route,
			headings: [{ depth: 1, slug: 'heading-1', text: 'Heading 1' }],
		},
		context: getRouteDataTestContext('/en'),
	});

	expect(getNewestCommitDate).toHaveBeenCalledOnce();
	expect(getNewestCommitDate).toHaveBeenCalledWith(
		'src/content/docs/guides/authoring-content.mdx'
		//               ^ no `en/` prefix
	);

	getNewestCommitDate.mockRestore();
});
