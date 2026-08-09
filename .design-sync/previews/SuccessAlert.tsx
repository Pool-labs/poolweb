import { SuccessAlert, IdList } from "my-v0-project"

export function TitleOnly() {
  return (
    <div className="max-w-lg">
      <SuccessAlert title="Job completed" />
    </div>
  )
}

export function WithDetail() {
  return (
    <div className="max-w-lg">
      <SuccessAlert title="Reseed finished">
        <p>Staging now has 24 users across 6 pools.</p>
        <IdList label="Pool ids" ids={["pl_8f2a", "pl_4c19", "pl_77bd"]} />
      </SuccessAlert>
    </div>
  )
}
