import { Route, Switch } from "wouter";
import LegacyPage from "./pages/legacy-page";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={LegacyPage} />
        <Route path="/admin" component={LegacyPage} />
        <Route path="/stats" component={LegacyPage} />
        <Route path="/predictions" component={LegacyPage} />
        <Route component={LegacyPage} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
