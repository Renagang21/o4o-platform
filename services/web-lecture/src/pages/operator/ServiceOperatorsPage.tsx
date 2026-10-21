import { ServiceOperatorManagement } from "@o4o/operator-core-ui";
import { api } from "../../lib/apiClient";
import { useAuth } from "../../contexts/AuthContext";
export default function ServiceOperatorsPage() {
  const { user } = useAuth();
  if (
    user?.roles?.includes("platform:super_admin") &&
    !user.roles.includes("lecture:admin")
  ) {
    return (
      <p>
        이 화면은 해당 서비스 Admin이 사용합니다.{" "}
        <a href="https://admin.neture.co.kr/operators">
          전체 관리자에서 역할 관리
        </a>
      </p>
    );
  }
  return (
    <ServiceOperatorManagement key={user?.id} client={api} scope="lecture" />
  );
}
