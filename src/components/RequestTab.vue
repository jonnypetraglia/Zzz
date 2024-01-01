<script setup lang="ts">
import axios from "axios";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Breadcrumb from "primevue/breadcrumb";
import Dropdown from "primevue/dropdown";
import { MenuItem } from "primevue/menuitem";
import EditableTable from "./EditableTable.vue";
import Authorization from "./Authorization.vue";
import Body from "./Body.vue";
import { ref, toRef, toRefs } from "vue";
const basename = (path) => path.split("/").reverse()[0];

const props = defineProps(["value"]);

const { value } = toRefs(props);
const requestData = ref({} as any);
const breadcrumbs = ref([] as MenuItem[]);
const methods = ["GET", "POST", "PUT", "DELETE", "INFO"];
const method = ref("GET");

async function fetchRequest(value: string): Promise<any> {
  return axios
    .get("http://localhost:8000/" + value)
    .then((res) => {
      return res.data;
    })
    .catch((error) => {
      console.error("ERROR", error.message, `(${error.code})`);
      console.error(error.stack);
      throw error;
    });
}
function doTheThing(newValue: string) {
  const newBreadcrumbs = [] as MenuItem[];
  let href = "";
  for (const pathPart of newValue.split("/")) {
    href += "/" + pathPart;
    if (href.startsWith("/")) {
      href = href.substring(1);
    }
    newBreadcrumbs.push({
      label: basename(pathPart),
      url: "#" + href
    });
  }
  breadcrumbs.value = newBreadcrumbs;
  fetchRequest(newValue)
    .then((data) => {
      console.log("data", data);
      if (data.Type == "Request") {
        requestData.value = data;
      }
      method.value = data.Method;
    })
    .catch((error) => {
      console.error("ERROR", error.message, `(${error.code})`);
      console.error(error.stack);
      throw error;
    });
}

if (value) {
  doTheThing(value.value);
}
const authorization = ref("None");

async function send() {
  const theRequest = requestData.value;
  console.log("HERE WE GO???");
  const what = (
    await axios({
      method: theRequest.Method,
      headers: theRequest.Headers,
      params: theRequest.QueryParams,
      url: theRequest.URL,
      data: theRequest.Body
    })
  ).data;
  console.log("what", what);
  return what;
}
</script>

<template>
  <Breadcrumb :model="breadcrumbs" />
  <div class="flex">
    <Dropdown id="asdf" disabled v-model="method" :options="methods" class="w-full md:w-14rem" />
    <InputText disabled type="text" :value="(requestData as any).URL" />
    <Button label="Send" @click="send">Send</Button>
  </div>
  <div class="">
    <TabView>
      <TabPanel header="Params"><EditableTable :data="requestData.QueryParams"></EditableTable></TabPanel>
      <TabPanel header="Authorization">
        <Authorization :type="authorization"></Authorization>
      </TabPanel>
      <TabPanel header="Headers"><EditableTable :data="requestData.Headers"></EditableTable></TabPanel>
      <TabPanel header="Body">
        <Body :body="requestData.Body"></Body>
      </TabPanel>
      <TabPanel header="Settings">TODO</TabPanel>
      <TabPanel header="Source">
        <pre>{{ requestData }}</pre>
      </TabPanel>
    </TabView>
  </div>
</template>

<style scoped>
.flex {
  display: flex;
  flex-direction: row;
}
pre {
  border: 1px #333 solid;
  background: #222;
  padding: 0.5rem;
}
#asdf {
  width: 7em;
}
button {
  width: 5em;
  display: flex;
}
input {
  display: flex;
  flex: 1;
}
</style>