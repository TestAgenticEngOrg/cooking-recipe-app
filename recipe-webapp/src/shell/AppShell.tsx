import type { JSX } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  Header,
  Sidebar,
  Footer,
  UserMenu,
  ColorSchemeToggle,
  Divider,
} from "@wso2/oxygen-ui";
import { BookOpen, CalendarDays, ShoppingCart, LogOut } from "@wso2/oxygen-ui-icons-react";
import { APP_NAME } from "../appName";
import { Can, useAuthz } from "../authz/gates";
import { signOut } from "../authz/session";
import { SCREEN_ROUTES } from "../authz/screens";

const NAV_ITEMS = [
  { key: "recipes", label: "Recipes", path: "/recipes", icon: <BookOpen size={18} /> },
  { key: "meal-plan", label: "Meal Plan", path: "/meal-plan", icon: <CalendarDays size={18} /> },
  {
    key: "shopping-list",
    label: "Shopping List",
    path: "/shopping-list",
    icon: <ShoppingCart size={18} />,
  },
] as const;

const LOADS_BY_KEY = new Map(SCREEN_ROUTES.map((screen) => [screen.key, screen.loads]));

export function AppShell(): JSX.Element {
  const { pathname } = useLocation();
  const { username } = useAuthz();

  const active = NAV_ITEMS.find((item) => pathname.startsWith(item.path))?.key ?? "recipes";

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Cook"} />
              <UserMenu.Header name={username || "Cook"} email={username || ""} />
              <UserMenu.Logout
                icon={<LogOut size={18} />}
                label="Sign out"
                onClick={() => void signOut()}
              />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {NAV_ITEMS.map((item) => {
                const loads = LOADS_BY_KEY.get(item.key) ?? null;
                const navItem = (
                  <Sidebar.Item
                    key={item.key}
                    id={item.key}
                    link={<Link to={item.path} />}
                  >
                    <Sidebar.ItemIcon>{item.icon}</Sidebar.ItemIcon>
                    <Sidebar.ItemLabel>{item.label}</Sidebar.ItemLabel>
                  </Sidebar.Item>
                );
                return loads === null ? (
                  navItem
                ) : (
                  <Can key={item.key} op={loads}>
                    {navItem}
                  </Can>
                );
              })}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
