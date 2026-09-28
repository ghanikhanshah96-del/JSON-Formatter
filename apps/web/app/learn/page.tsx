import { permanentRedirect } from "next/navigation";

export default function LearnIndexRedirect() {
  permanentRedirect("/blog");
}
