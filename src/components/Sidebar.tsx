'use client';

import { useMemo, useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSidebarStore } from '@/src/store/useSidebarStore';
import { usePathname, useRouter } from '@/src/i18n/navigation';
import { useSidebarMenu } from '@/src/hooks/useSidebarMenu';
import type { SidebarItem } from '@/src/types/sidebar';

const normalizePathname = (pathname: string) =>
  pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';

const isPathMatch = (current: string, target: string) =>
  current === target || current.startsWith(`${target}/`);

const findActiveItem = (items: SidebarItem[], pathname: string) => {
  const normalizedPath = normalizePathname(pathname);

  for (const item of items) {
    if (item.href && isPathMatch(normalizedPath, item.href)) {
      return { activeKey: item.id, parentKey: null };
    }

    if (item.subItems?.length) {
      for (const subItem of item.subItems) {
        if (isPathMatch(normalizedPath, subItem.href)) {
          return { activeKey: subItem.id, parentKey: item.id };
        }
      }
    }
  }

  return { activeKey: '', parentKey: null };
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed, collapse, expand } = useSidebarStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const tCommon = useTranslations('common');
  const { items: menuitems, isLoading } = useSidebarMenu();

  const { activeKey, parentKey } = useMemo(
    () => findActiveItem(menuitems, pathname),
    [menuitems, pathname],
  );

  // Open the active item's group when navigation changes it (adjusted during
  // render); the user can still collapse it afterwards.
  const [seenParentKey, setSeenParentKey] = useState<string | null>(null);
  if (parentKey !== seenParentKey) {
    setSeenParentKey(parentKey);
    if (parentKey && !expandedItems.includes(parentKey)) {
      setExpandedItems([...expandedItems, parentKey]);
    }
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((item) => item !== itemId)
        : [...prev, itemId],
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`
          fixed
          inset-0
        bg-black/50 z-30 sm:hidden transition-opacity duration-300 ${
          isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={collapse}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed sm:relative sm:row-start-2
          top-0 ltr:left-0 rtl:right-0 h-full sm:h-auto
          bg-white text-gray-900 
          ltr:shadow-[6px_0_6px_rgba(0,0,0,0.1)] rtl:shadow-[-6px_0_6px_rgba(0,0,0,0.1)]
          shrink-0 transition-all duration-300 ease-in-out 
          overflow-auto overflow-x-hidden z-40 sm:z-auto
          ${
            isCollapsed
              ? 'w-0 sm:w-20 max-sm:ltr:-translate-x-full max-sm:rtl:translate-x-full'
              : 'w-64 translate-x-0'
          }
        `}
      >
        {/* Mobile close button */}
        <div className="flex justify-end p-2 sm:hidden">
          <button
            onClick={collapse}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#8F9BB3]"
            aria-label={tCommon('closeSidebar')}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 pt-0 sm:pt-4 w-64">
          <nav className="space-y-2">
            {menuitems.map((item) => {
              const Icon = item.icon;
              const isActive = activeKey === item.id;
              const isActiveParent = parentKey === item.id || isActive;
              const isExpanded = expandedItems.includes(item.id);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const label = item.label;

              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      // If sidebar is collapsed and item has sub-items, expand sidebar
                      if (isCollapsed && hasSubItems) {
                        expand();
                      }

                      if (hasSubItems) {
                        toggleExpand(item.id);
                      }

                      // On mobile, close sidebar after navigation (only if no sub-items)
                      if (!hasSubItems && window.innerWidth < 640) {
                        collapse();
                      }

                      if (item.href && !hasSubItems) {
                        router.push(item.href);
                      }
                    }}
                    className={`group flex items-center gap-7 w-full p-3 rounded-lg transition-colors hover:bg-gray-50 ${
                      isActiveParent ? 'bg-blue-50' : ''
                    }`}
                    title={isCollapsed ? label : ''}
                  >
                    <Icon
                      size={24}
                      className={`shrink-0 ${
                        isActiveParent
                          ? 'text-blue-600'
                          : 'text-[#A2ACC0] group-hover:text-blue-500'
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold whitespace-nowrap flex-1 text-start ${
                        isActiveParent
                          ? 'text-blue-600'
                          : 'group-hover:text-blue-500'
                      }`}
                    >
                      {item.label}
                    </span>
                    {hasSubItems && !isCollapsed && (
                      <span className="text-[#A2ACC0] group-hover:text-blue-500">
                        {isExpanded ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} className="rtl:rotate-180" />
                        )}
                      </span>
                    )}
                  </button>

                  {/* Sub-items */}
                  {hasSubItems && isExpanded && !isCollapsed && (
                    <div className="mt-1 ms-8 space-y-1">
                      {item.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const subLabel = subItem.label;
                        const isSubActive = activeKey === subItem.id;

                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              // On mobile, close sidebar after navigation
                              if (window.innerWidth < 640) {
                                collapse();
                              }

                              router.push(subItem.href);
                            }}
                            className={`group flex items-center gap-3 w-full p-2 rounded-lg transition-colors hover:bg-gray-50 ${
                              isSubActive ? 'bg-blue-50' : ''
                            }`}
                          >
                            <SubIcon
                              size={18}
                              className={`shrink-0 ${
                                isSubActive
                                  ? 'text-blue-600'
                                  : 'text-[#A2ACC0] group-hover:text-blue-500'
                              }`}
                            />
                            <span
                              className={`text-sm whitespace-nowrap ${
                                isSubActive
                                  ? 'text-blue-600'
                                  : 'text-gray-600 group-hover:text-blue-500'
                              }`}
                            >
                              {subLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {!menuitems.length && !isLoading && (
              <p className="text-sm text-gray-500 px-3">No menu items</p>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
